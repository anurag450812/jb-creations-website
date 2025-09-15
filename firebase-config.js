// Firebase Configuration for JB Creations Website
// Configuration for "JB Creations Auth" project

// Your Firebase configuration object
const firebaseConfig = {
    apiKey: "AIzaSyD0FgVzeo2P9rgNUqseQxIz_7oKA7hF6Tk",
    authDomain: "jb-creations-auth.firebaseapp.com",
    projectId: "jb-creations-auth",
    storageBucket: "jb-creations-auth.firebasestorage.app",
    messagingSenderId: "251713146803",
    appId: "1:251713146803:web:b715d0da34f875aed205c6"
};

// Initialize Firebase (make sure this runs after Firebase SDK loads)
let firebaseApp;
let firebaseAuth;

// Wait for Firebase SDK to load
function initializeFirebase() {
    if (typeof firebase !== 'undefined') {
        try {
            // Initialize Firebase app
            firebaseApp = firebase.initializeApp(firebaseConfig);
            firebaseAuth = firebase.auth();
            
            // Make Firebase auth globally available
            window.firebaseAuth = firebaseAuth;
            window.firebase = firebase;
            
            // Set up auth state listener
            firebaseAuth.onAuthStateChanged(function(user) {
                if (user) {
                    console.log('Firebase user signed in:', user.phoneNumber);
                    // Handle signed-in user
                    handleFirebaseAuthSuccess(user);
                } else {
                    console.log('Firebase user signed out');
                    // Handle signed-out user
                }
            });
            
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    } else {
        console.warn('Firebase SDK not loaded yet, retrying...');
        setTimeout(initializeFirebase, 100);
    }
}

// Handle successful Firebase authentication
function handleFirebaseAuthSuccess(firebaseUser) {
    // Create user object compatible with existing system
    const user = {
        id: firebaseUser.uid,
        phone: firebaseUser.phoneNumber,
        name: authState.signupData?.name || `User ${firebaseUser.phoneNumber?.slice(-4)}`,
        email: authState.signupData?.email || null,
        signInMethod: 'phone',
        createdAt: new Date().toISOString(),
        firebaseUser: firebaseUser
    };
    
    // Update existing auth state
    if (typeof authState !== 'undefined') {
        authState.user = user;
        authState.isAuthenticated = true;
        
        // Save to localStorage for persistence
        localStorage.setItem('jb_user', JSON.stringify(user));
        
        // Also save to existing users array
        if (typeof saveUser === 'function') {
            saveUser(user);
        }
    }
}

// Initialize Firebase when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
    initializeFirebase();
}