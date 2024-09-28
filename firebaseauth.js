// Import the functions you need from the SDKs you need

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-analytics.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
  getFirestore,
  setDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: "AIzaSyBQIoG1AKHFRkJv7VZ6Z39ob-Fm8lYYo5w",

  authDomain: "brew-match.firebaseapp.com",

  projectId: "brew-match",

  storageBucket: "brew-match.appspot.com",

  messagingSenderId: "871621577528",

  appId: "1:871621577528:web:d8af0d672974024d954fcd",

  measurementId: "G-Y6YQ6NBFMX",
};

// Initialize Firebase

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);

function displayMessage(message, divId) {
  let msg = document.getElementById(divId);
  msg.style.display = "block";
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
