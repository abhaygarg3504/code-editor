import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { api } from '@/convex/_generated/api';
import { preloadQuery } from 'convex/nextjs';
import ClientPage from './_components/ClientPage';

const Page = async () => {
  const { userId } = await auth();
  let convexUser = { isPro: false };
  
  if (userId) {
    try {
      const preloadedUserResult = await preloadQuery(api.users.getUser, { userId });
      
      if (preloadedUserResult && preloadedUserResult._valueJSON) {
        const userData = JSON.parse(preloadedUserResult._valueJSON);
        if (userData && typeof userData.isPro === 'boolean') {
          convexUser = { isPro: userData.isPro };
         }
      }
    } catch (error) {
      console.error("Server: Failed to load user data:", error);
    }
  }

  return (
    <ClientPage 
      userId={userId} 
      convexUser={convexUser}
    />
  );
};

export default Page;