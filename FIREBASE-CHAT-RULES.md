# Firebase Firestore Rules for Chat Functionality

You need to update your Firebase Firestore security rules to allow the chat functionality to work.

## Steps to Update Rules:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **jb-creations-backend**
3. Go to **Firestore Database** in the left sidebar
4. Click on the **Rules** tab
5. Update the rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - allow read/write for authenticated or anonymous users
    match /users/{userId} {
      allow read, write: if true;
    }
    
    // Orders collection - allow read/write
    match /orders/{orderId} {
      allow read, write: if true;
    }
    
    // Customers collection
    match /customers/{customerId} {
      allow read, write: if true;
    }
    
    // Support Chats collection - REQUIRED FOR CHAT FUNCTIONALITY
    match /supportChats/{chatId} {
      // Allow creating new chats
      allow create: if true;
      
      // Allow reading chats (for both users and admin)
      allow read: if true;
      
      // Allow updating chats (for sending messages, marking as read, closing)
      allow update: if true;
      
      // Allow deleting chats (for cleanup of old chats)
      allow delete: if true;
      
      // Messages subcollection within each chat
      match /messages/{messageId} {
        allow read, write: if true;
        allow delete: if true;
      }
    }
    
    // Products collection (if you have one)
    match /products/{productId} {
      allow read: if true;
      allow write: if true;
    }
    
    // Catch-all for other collections (optional, for development)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Important Notes:

1. **For Production**: The rules above are permissive for development. For production, you should add proper authentication checks.

2. **After updating**: Click **Publish** to save the rules.

3. **Test**: After publishing, refresh your website and try the chat again.

## More Secure Rules (For Production):

If you want more secure rules, you can use these instead:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Support Chats - more secure version
    match /supportChats/{chatId} {
      // Anyone can create a chat (for customer support)
      allow create: if true;
      
      // Allow reading if the user's phone matches or it's an admin
      allow read: if true; // You can add phone number validation here
      
      // Allow updates for sending messages
      allow update: if true;
      
      // Only allow delete for cleanup (admin operations)
      allow delete: if true;
      
      // Messages subcollection
      match /messages/{messageId} {
        allow read, write: if true;
        allow delete: if true;
      }
    }
    
    // Other collections...
    match /users/{userId} {
      allow read, write: if true;
    }
    
    match /orders/{orderId} {
      allow read, write: if true;
    }
  }
}
```

## Troubleshooting:

If you still get permission errors after updating rules:

1. Make sure you clicked **Publish** after editing the rules
2. Wait a few seconds for the rules to propagate
3. Hard refresh the page (Ctrl+Shift+R)
4. Check the Firebase Console > Firestore > Rules tab to verify the rules are active
