import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const getId = (req: Request) => {
  const url = new URL(req.url);
  return url.pathname.split('/').splice(-1, 1)[0];
};

// TODO: Limit these to same domain requests
export async function GET(req: NextRequest, res: NextResponse) {
  const id = getId(req);

  let assistant = await prisma.assistant.findFirst({
    where: {
      id: id,
    },
    select: {
      id: true,
      object: true,
    },
  });

  if (!assistant) {
    return Response.json(
      { message: 'Assistant does not exist' },
      { status: 404 }
    );
  }
  return Response.json(assistant.object, { status: 200 });
}

export async function PATCH(req: NextRequest, res: NextResponse) {
  const token = await getToken({ req });

  const id = getId(req);

  if (token) {
    let account = await prisma.account.findFirst({
      where: {
        owner: token.sub,
        ownerType: 'personal',
      },
    });

    if (account) {
      const openai = new OpenAI({
        apiKey: account.openAIApiKey,
      });

      try {
        const body = await req.json();
        delete body.id;

        // TODO: Check if assistant exists and if the user is the owner
        let assistant = await prisma.assistant.findFirst({
          where: {
            id: id,
          },
          select: {
            id: true,
            object: true,
            accountOwner: true,
            accountOwnerType: true,
          },
        });

        if (
          !assistant ||
          assistant.accountOwner !== token.sub ||
          assistant.accountOwnerType !== 'personal'
        ) {
          return Response.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // If the user is authorized, let us proceed
        const updateResponse = await openai.beta.assistants.update(id, body);

        await prisma.assistant.upsert({
          where: {
            id: updateResponse.id,
          },
          update: {
            id: updateResponse.id,
            accountOwner: token.sub,
            accountOwnerType: 'personal',
            object: updateResponse as any,
          },
          create: {
            id: updateResponse.id,
            accountOwner: token.sub,
            accountOwnerType: 'personal',
            object: updateResponse as any,
          },
        });

        return Response.json(updateResponse, { status: 200 });
      } catch (err: any) {
        return Response.json({ message: err.message }, { status: err.status });
      }
    } else {
      return Response.json(
        { message: 'OpenAI API Key does not exist' },
        { status: 400 }
      );
    }
  } else {
    // Not Signed in
    return Response.json({ message: 'Unauthenticated' }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest, res: NextResponse) {
  const token = await getToken({ req });

  const id = getId(req);

  if (token) {
    let account = await prisma.account.findFirst({
      where: {
        owner: token.sub,
        ownerType: 'personal',
      },
    });

    if (account) {
      const openai = new OpenAI({
        apiKey: account.openAIApiKey,
      });

      try {
        // TODO: Check if assistant exists and if the user is the owner
        let assistant = await prisma.assistant.findFirst({
          where: {
            id: id,
          },
          select: {
            id: true,
            object: true,
            accountOwner: true,
            accountOwnerType: true,
          },
        });

        if (
          !assistant ||
          assistant.accountOwner !== token.sub ||
          assistant.accountOwnerType !== 'personal'
        ) {
          return Response.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const deleteResponse = await openai.beta.assistants.del(id);

        await prisma.assistant.delete({
          where: {
            id: id,
          },
        });

        return Response.json(deleteResponse, { status: 200 });
      } catch (err: any) {
        return Response.json({ message: err.message }, { status: err.status });
      }
    } else {
      return Response.json(
        { message: 'OpenAI API Key does not exist' },
        { status: 400 }
      );
    }
  } else {
    // Not Signed in
    return Response.json({ message: 'Unauthenticated' }, { status: 401 });
  }
}
