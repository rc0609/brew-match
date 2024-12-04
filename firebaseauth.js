// Import the functions you need from the SDKs you need

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-analytics.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
  getFirestore,
  setDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import config from "./config.js";
const firebaseConfig = config.firebase;
// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

// Initialize Firebase

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);

function displayMessage(message, divId) {
  let msg = document.getElementById(divId);
  msg.classList.remove("hidden");
  msg.innerHTML = message;
  msg.style.opacity = 1;
}

const signUp = document.getElementById("signup-button");
signUp.addEventListener("click", (event) => {
  event.preventDefault();
  const email = document.getElementById("email-signup").value;
  const fName = document.getElementById("fName-signup").value;
  const lName = document.getElementById("lName-signup").value;
  const pWord = document.getElementById("pWord-signup").value;

  const auth = getAuth();
  const db = getFirestore();

  createUserWithEmailAndPassword(auth, email, pWord)
    .then((userCredential) => {
      const user = userCredential.user;
      const userData = {
        email: email,
        firstName: fName,
        lastName: lName,
      };
      displayMessage("Account Created Successfully!", "signup-message");
      const docRef = doc(db, "users", user.uid);
      setDoc(docRef, userData)
        .then(() => {
          window.location.href = "index.html";
        })
        .catch((error) => {
          console.error("Error writing to database", error);
        });
    })
    .catch((error) => {
      const errorCode = error.code;
      if (errorCode == "auth/email-already-in-use") {
        showMessage("Email Address already in use", "signup-message");
      } else {
        showMessage("Unable to create user", "signup-message");
      }
    });
});

const signIn = document.getElementById("login-button");
signIn.addEventListener("click", (event) => {
  event.preventDefault;
  const email = document.getElementById("login-email").value;
  const pWord = document.getElementById("login-password").value;
  const auth = getAuth();

  signInWithEmailAndPassword(auth, email, pWord)
    .then((userCredential) => {
      displayMessage("Login Successfully", "login-message");
      const user = userCredential.user;
      localStorage.setItem("loggedInUserId", user.uid);
      window.location.href = "homepage.html";
    })
    .catch((error) => {
      const errorCode = error.code;
      if (errorCode === "auth/invalid-credential") {
        displayMessage("Incorrect Email or Password", "login-message");
      } else {
        displayMessage("Account does not Exist", "login-message");
      }
    });
});

const guestSignInButton = document.getElementById("guest-signin-button");
guestSignInButton.addEventListener("click", (event) => {
  event.preventDefault();
  const auth = getAuth();
  const db = getFirestore();

  signInAnonymously(auth)
    .then(() => {
      // Signed in anonymously
      const user = auth.currentUser;
      displayMessage("Signed in as Guest!", "guest-signin-message");
      localStorage.setItem("loggedInUserId", user.uid);

      // Create a user document if it doesn't exist
      const userRef = doc(db, "users", user.uid);
      return setDoc(
        userRef,
        {
          email: null,
          firstName: null,
          lastName: null,
          isAnonymous: true,
        },
        { merge: true }
      );
    })
    .then(() => {
      window.location.href = "homepage.html";
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      displayMessage(`Error: ${errorMessage}`, "guest-signin-message");
    });
});
