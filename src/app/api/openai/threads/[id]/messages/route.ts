import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIObjectForAssistant } from '@/app/api/utils';

const prisma = new PrismaClient();

const getId = (req: Request) => {
  const url = new URL(req.url);
  return url.pathname.split('/').splice(-2, 1)[0];
};

export async function GET(req: NextRequest, res: NextResponse) {
  try {
    let threadId = getId(req);
    let after = req.nextUrl.searchParams.get('after');
    const openai = (await getOpenAIObjectForAssistant(req, prisma)) as OpenAI;
    let assistantId = req.headers.get('X-Assistant-Id');

    try {
      if (after !== null) {
        // @ts-ignore
        let messagesResponse = await openai.beta.threads.messages.list(
          threadId,
          {
            order: 'asc',
            after: after,
          }
        );

        // If new messages are being pulled and presented then lets sync them up with the database
        for (let i = 0; i < messagesResponse.data.length; i++) {
          let message = messagesResponse.data[i];
          await prisma.message.upsert({
            where: {
              id: message.id,
            },
            update: {
              id: message.id,
              threadId: threadId,
              object: message as any,
            },
            create: {
              id: message.id,
              threadId: threadId,
              object: message as any,
            },
          });

          // add the metric event for Message creation
          await prisma.metric.create({
            data: {
              assistantId: assistantId ? assistantId : 'unknown',
              name: 'MESSAGE_CREATED',
              value: 1,
              time: new Date(message.created_at),
              tags: message as any,
            },
          });
        }

        return Response.json(messagesResponse, { status: 200 });
      } else {
        let messages = await prisma.message.findMany({
          where: {
            threadId: threadId,
          },
          orderBy: {
            created_at: 'asc',
          },
        });

        return Response.json({ data: messages }, { status: 200 });
      }
    } catch (err: any) {
      console.log(err);
      return Response.json({ message: err.message }, { status: err.status });
    }
  } catch (err: any) {
    console.log(err);
    return Response.json({ message: err.message }, { status: err.status });
  }
}

export async function POST(req: NextRequest, res: NextResponse) {
  try {
    const body = await req.json();
    let threadId = getId(req);
    const openai = (await getOpenAIObjectForAssistant(req, prisma)) as OpenAI;
    let assistantId = req.headers.get('X-Assistant-Id');

    let message = {
      role: body.message.role,
      content: body.message.content[0].text.value,
    };

    try {
      let createMessageResponse = await openai.beta.threads.messages.create(
        threadId,
        message
      );

      await prisma.message.upsert({
        where: {
          id: createMessageResponse.id,
        },
        update: {
          id: createMessageResponse.id,
          threadId: threadId,
          object: createMessageResponse as any,
        },
        create: {
          id: createMessageResponse.id,
          threadId: threadId,
          object: createMessageResponse as any,
        },
      });

      // add the metric event for Message creation
      await prisma.metric.create({
        data: {
          assistantId: assistantId ? assistantId : 'unknown',
          name: 'MESSAGE_CREATED',
          value: 1,
          tags: createMessageResponse as any,
        },
      });

      return Response.json(createMessageResponse, { status: 201 });
    } catch (err: any) {
      console.log(err);
      return Response.json({ message: err.message }, { status: err.status });
    }
  } catch (err: any) {
    console.log(err);
    return Response.json({ message: err.message }, { status: err.status });
  }
}
