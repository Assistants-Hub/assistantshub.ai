'use client';

import { ChatProps } from '@/app/assistants/[id]/chat/ChatProps';
import ChatPopup from '@/app/assistants/[id]/chat/ChatPopup';
import { Avatar, Dropdown, Textarea } from 'flowbite-react';
import { getImageHash } from '@/app/utils/hash';
import { useState } from 'react';

export default function ChatAgent(props: ChatProps) {
  return (
    <div className='stack items-center justify-center'>
      <div data-dial-init className='group fixed bottom-10 right-10'>
        <div className='flex flex-row-reverse pt-5'>
          <Dropdown
            label={
              <Avatar
                img={
                  '/images/people/avatar/' +
                  getImageHash(props.assistant.id) +
                  '.jpg'
                }
                alt='avatar'
                size='lg'
                status='online'
                statusPosition='top-right'
                color='success'
                rounded
              />
            }
            placement={'top-end'}
            arrowIcon={false}
            inline={true}
            dismissOnClick={false}
            className='border-transparent bg-transparent'
          >
            <ChatPopup assistant={props.assistant} />
          </Dropdown>
        </div>
      </div>
    </div>
  );
}