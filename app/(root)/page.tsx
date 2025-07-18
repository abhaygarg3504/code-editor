// import React from 'react';
// import { auth, currentUser } from '@clerk/nextjs/server';
// import { api } from '@/convex/_generated/api';
// import { preloadQuery } from 'convex/nextjs';
// import ClientPage from './_components/ClientPage';

// const Page = async () => {
//   const { userId } = await auth();
  
//   // Preload user data if userId exists
//   let convexUser = { isPro: false };
//    const user = await currentUser();
  
//   if (userId) {
//     try {
//       // Assuming you have a convex query to get user data
//       // Replace this with your actual convex query
//       const preloadedUser = await preloadQuery(api.users.getUser, { userId });
//       // Extract the actual user data from the preloaded query result
//       const userData = preloadedUser?.data ?? null;
//       convexUser = userData ? { isPro: userData.isPro } : { isPro: false };
//     } catch (error) {
//       console.log("Failed to load user data:", error);
//       // Use default values
//     }
//   }

//   return (
//     <ClientPage 
//       userId={userId} 
//       convexUser={convexUser}
//     />
//   );
// };

// export default Page;

import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { api } from '@/convex/_generated/api';
import { preloadQuery } from 'convex/nextjs';
import ClientPage from './_components/ClientPage';

const Page = async () => {
  const { userId } = await auth();
  
  // Initialize default convex user
  let convexUser = { isPro: false };
  
  if (userId) {
    try {
      // Preload user data using the correct query
      const preloadedUserResult = await preloadQuery(api.users.getUser, { userId });
      
      // Extract the user data from preloaded query
      if (preloadedUserResult && preloadedUserResult._valueJSON) {
        const userData = JSON.parse(preloadedUserResult._valueJSON);
        if (userData && typeof userData.isPro === 'boolean') {
          convexUser = { isPro: userData.isPro };
          console.log("Server: User data loaded successfully:", convexUser);
        }
      }
    } catch (error) {
      console.error("Server: Failed to load user data:", error);
      // Keep default values
    }
  }

  console.log("Server: Final convexUser being passed:", convexUser);

  return (
    <ClientPage 
      userId={userId} 
      convexUser={convexUser}
    />
  );
};

export default Page;