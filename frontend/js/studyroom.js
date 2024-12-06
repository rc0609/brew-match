import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-analytics.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  onDisconnect,
  remove,
  push,
  serverTimestamp as rtdbTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

import config from "../../config/config.js";
const firebaseConfig = config.firebase;

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const db = getFirestore();
const rtdb = getDatabase();

class StudyRoom {
  constructor() {
    this.currentTool = "pencil";
    this.currentUser = null;
    this.currentRoom = null;
    this.canvas = document.getElementById("whiteboard");
    this.ctx = this.canvas.getContext("2d");
    this.isDrawing = false;
    this.currentPath = [];
    this.pathsRef = null;
    this.pathsListener = null;
    this.MAX_BRUSH_SIZE = 50;
    this.ERASER_SCALE = 2;

    document.addEventListener("DOMContentLoaded", () => {
      document.querySelector(".room-tools").classList.remove("active");
      document.querySelector(".content-container").classList.remove("active");
      this.initializeAuth();
      this.initializeCanvas();
      this.initializeEventListeners();
      this.setupVisibilityHandler();
    });
  }

  initializeAuth() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.loadUserInfo();
        this.setupPresence();
        this.initializeLogout();
      } else {
        window.location.href = "index.html";
      }
    });
  }

  async loadUserInfo() {
    try {
      const userDoc = await getDoc(doc(db, "users", this.currentUser.uid));
      const userData = userDoc.data();
      this.userDisplayName = userData.isAnonymous
        ? "Guest User"
        : `${userData.firstName} ${userData.lastName}`;
      document.getElementById("userDisplay").textContent = this.userDisplayName;
    } catch (error) {
      console.error("Error loading user info:", error);
    }
  }

  initializeLogout() {
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      try {
        if (this.currentRoom) {
          await this.leaveRoom();
        }
        await signOut(auth);
        window.location.href = "index.html";
      } catch (error) {
        console.error("Error signing out:", error);
      }
    });
  }

  setupPresence() {
    const userStatusRef = ref(rtdb, `status/${this.currentUser.uid}`);
    const userStatusDoc = doc(db, "status", this.currentUser.uid);

    const isOfflineData = {
      state: "offline",
      last_changed: rtdbTimestamp(),
      user_name: this.userDisplayName,
    };

    const isOnlineData = {
      state: "online",
      last_changed: rtdbTimestamp(),
      user_name: this.userDisplayName,
    };

    onValue(ref(rtdb, ".info/connected"), (snapshot) => {
      if (!snapshot.val()) return;

      onDisconnect(userStatusRef)
        .set(isOfflineData)
        .then(() => {
          set(userStatusRef, isOnlineData);
        });
    });

    setDoc(userStatusDoc, {
      state: "online",
      last_changed: serverTimestamp(),
      user_name: this.userDisplayName,
    });
  }

  initializeCanvas() {
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.setCanvasSettings();
  }

  setCanvasSettings() {
    if (!this.ctx) return;

    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
  }

  resizeCanvas() {
    if (!this.canvas) return;

    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    this.setCanvasSettings();
  }

  initializeEventListeners() {
    const toolSelect = document.getElementById("toolSelect");
    toolSelect.addEventListener("change", (e) => {
      this.currentTool = e.target.value;
    });
    document.querySelectorAll(".room-btn").forEach((button) => {
      button.addEventListener("click", () =>
        this.joinRoom(button.dataset.room)
      );
    });

    const colorPicker = document.getElementById("colorPicker");
    const brushSize = document.getElementById("brushSize");
    const clearBoard = document.getElementById("clearBoard");
    const saveBoard = document.getElementById("saveBoard");
    const messageInput = document.getElementById("messageInput");
    const sendMessage = document.getElementById("sendMessage");

    brushSize.max = this.MAX_BRUSH_SIZE;
    brushSize.addEventListener("change", (e) => {
      const size = Math.min(parseInt(e.target.value), this.MAX_BRUSH_SIZE);
      this.ctx.lineWidth =
        this.currentTool === "eraser" ? size * this.ERASER_SCALE : size;
    });

    colorPicker.addEventListener(
      "change",
      (e) => (this.ctx.strokeStyle = e.target.value)
    );
    brushSize.addEventListener(
      "change",
      (e) => (this.ctx.lineWidth = e.target.value)
    );
    clearBoard.addEventListener("click", () => this.clearWhiteboard());
    saveBoard.addEventListener("click", () => this.saveWhiteboard());

    this.canvas.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.startDrawing(e);
    });

    this.canvas.addEventListener("mousemove", (e) => {
      e.preventDefault();
      this.draw(e);
    });

    this.canvas.addEventListener("mouseup", (e) => {
      e.preventDefault();
      this.stopDrawing();
    });

    this.canvas.addEventListener("mouseleave", (e) => {
      e.preventDefault();
      if (this.isDrawing) {
        this.stopDrawing();
      }
    });
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.startDrawing(touch);
    });
    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.draw(touch);
    });

    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.stopDrawing();
    });

    messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    sendMessage.addEventListener("click", () => this.sendMessage());
  }

  async joinRoom(roomName) {
    if (this.currentRoom === roomName) return;

    if (this.currentRoom) {
      await this.leaveRoom();
    }

    this.currentRoom = roomName;
    document.getElementById("roomTitle").textContent = `${roomName} Room`;
    document.querySelector(".room-tools").classList.add("active");
    document.querySelector(".content-container").classList.add("active");

    setTimeout(() => {
      this.resizeCanvas();
    }, 0);

    document.querySelectorAll(".room-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.room === roomName);
    });

    const roomRef = doc(db, "rooms", roomName);
    const roomSnapshot = await getDoc(roomRef);

    if (!roomSnapshot.exists()) {
      await setDoc(roomRef, {
        created_at: serverTimestamp(),
        created_by: this.currentUser.uid,
      });
    }

    const roomUserRef = ref(
      rtdb,
      `rooms/${roomName}/users/${this.currentUser.uid}`
    );
    await set(roomUserRef, {
      name: this.userDisplayName,
      joined_at: rtdbTimestamp(),
    });

    onDisconnect(roomUserRef).remove();

    this.setupWhiteboardSync();

    this.subscribeToRoom();
  }

  setupWhiteboardSync() {
    console.log("Setting up whiteboard sync for room:", this.currentRoom);

    if (this.pathsListener) {
      this.pathsListener();
      this.pathsListener = null;
    }

    this.pathsRef = ref(rtdb, `rooms/${this.currentRoom}/whiteboard/paths`);

    this.pathsListener = onValue(
      this.pathsRef,
      (snapshot) => {
        console.log("Received whiteboard update:", snapshot.val());
        const pathsData = snapshot.val();

        if (pathsData) {
          this.redrawWhiteboard(pathsData);
        } else if (!this.isDrawing) {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
      },
      (error) => {
        console.error("Error in whiteboard sync:", error);
      }
    );
  }

  redrawWhiteboard(pathsData) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const sortedPaths = Object.entries(pathsData)
      .map(([key, value]) => ({ ...value, key }))
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    sortedPaths.forEach((path) => {
      if (!path.points || path.points.length < 2) return;

      this.ctx.beginPath();
      this.ctx.strokeStyle = path.isEraser ? "white" : path.color || "#000000";
      this.ctx.lineWidth = path.isEraser ? 20 : path.width || 2;
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";

      const points = path.points;
      this.ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i++) {
        this.ctx.lineTo(points[i].x, points[i].y);
      }

      this.ctx.stroke();
      this.ctx.closePath();
    });
  }

  async leaveRoom() {
    if (!this.currentRoom) return;

    const roomUserRef = ref(
      rtdb,
      `rooms/${this.currentRoom}/users/${this.currentUser.uid}`
    );
    await remove(roomUserRef);

    if (this.pathsListener) {
      this.pathsListener();
      this.pathsListener = null;
    }

    this.currentRoom = null;
    this.clearWhiteboard();
    document.getElementById("chatMessages").innerHTML = "";
    document.getElementById("roomTitle").textContent = "Select a Room";
  }

  subscribeToRoom() {
    document.getElementById("chatMessages").innerHTML = "";

    const chatRef = collection(db, "rooms", this.currentRoom, "messages");

    const q = query(chatRef, orderBy("timestamp", "asc"), limit(100));

    this.unsubscribeMessages = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            this.displayMessage(change.doc.data());
          }
        });
      },
      (error) => {
        console.error("Error in chat subscription:", error);
      }
    );

    const roomUsersRef = ref(rtdb, `rooms/${this.currentRoom}/users`);
    this.unsubscribeUsers = onValue(roomUsersRef, (snapshot) => {
      const users = snapshot.val() || {};
      this.updateActiveUsers(users);
    });
  }

  updateActiveUsers(users) {
    const usersList = document.getElementById("activeUsersList");
    usersList.innerHTML = "";

    Object.entries(users).forEach(([uid, userData]) => {
      const li = document.createElement("li");
      li.innerHTML = `
                <span class="user-status"></span>
                ${userData.name}
            `;
      usersList.appendChild(li);
    });
  }

  async sendMessage() {
    const input = document.getElementById("messageInput");
    const message = input.value.trim();

    if (!message || !this.currentRoom) return;

    try {
      const messageRef = collection(db, "rooms", this.currentRoom, "messages");
      await addDoc(messageRef, {
        text: message,
        user_id: this.currentUser.uid,
        user_name: this.userDisplayName,
        timestamp: serverTimestamp(),
        room: this.currentRoom,
      });

      input.value = "";
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    }
  }

  displayMessage(message) {
    if (!message || !message.text) {
      console.error("Invalid message data:", message);
      return;
    }

    const chatMessages = document.getElementById("chatMessages");

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${
      message.user_id === this.currentUser.uid ? "sent" : "received"
    }`;

    const sanitizedText = message.text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    messageDiv.innerHTML = `
        <strong>${message.user_name || "Unknown User"}</strong><br>
        ${sanitizedText}
    `;

    chatMessages.appendChild(messageDiv);

    requestAnimationFrame(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }

  startDrawing(e) {
    this.isDrawing = true;
    const pos = this.getCanvasPosition(e);
    this.startX = pos.x;
    this.startY = pos.y;

    this.currentPath = [pos];
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);

    if (this.currentTool === "eraser") {
      this.ctx.strokeStyle = "white";
      const baseWidth = Math.min(
        parseInt(document.getElementById("brushSize").value),
        this.MAX_BRUSH_SIZE
      );
      this.ctx.lineWidth = baseWidth * this.ERASER_SCALE;
    }
  }

  draw(e) {
    if (!this.isDrawing) return;

    const pos = this.getCanvasPosition(e);
    this.currentPath.push(pos);

    if (this.currentTool === "eraser") {
      this.ctx.strokeStyle = "white";
      const baseWidth = Math.min(
        parseInt(document.getElementById("brushSize").value),
        this.MAX_BRUSH_SIZE
      );
      this.ctx.lineWidth = baseWidth * this.ERASER_SCALE;

      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";
    }

    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  }

  async stopDrawing() {
    if (!this.isDrawing || !this.currentRoom) return;

    this.isDrawing = false;
    this.ctx.closePath();

    if (this.currentPath.length > 1) {
      try {
        const baseWidth = Math.min(
          parseInt(document.getElementById("brushSize").value),
          this.MAX_BRUSH_SIZE
        );
        const newPathRef = push(this.pathsRef);
        await set(newPathRef, {
          points: this.currentPath,
          color: this.currentTool === "eraser" ? "white" : this.ctx.strokeStyle,
          width:
            this.currentTool === "eraser"
              ? baseWidth * this.ERASER_SCALE
              : baseWidth,
          timestamp: rtdbTimestamp(),
          userId: this.currentUser.uid,
          isEraser: this.currentTool === "eraser",
        });

        console.log("Path saved successfully");
      } catch (error) {
        console.error("Error saving path:", error);
      }
    }

    if (this.currentTool === "eraser") {
      this.ctx.strokeStyle = document.getElementById("colorPicker").value;
      this.ctx.lineWidth = Math.min(
        parseInt(document.getElementById("brushSize").value),
        this.MAX_BRUSH_SIZE
      );
    }

    this.currentPath = [];
  }

  getCanvasPosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  sendPathToFirebase() {
    if (!this.currentRoom || this.currentPath.length < 2) return;

    const pathData = {
      points: this.currentPath,
      color: this.ctx.strokeStyle,
      width: this.ctx.lineWidth,
      timestamp: rtdbTimestamp(),
      userId: this.currentUser.uid,
    };

    push(this.pathsRef, pathData);
  }

  drawFromFirebase(data) {
    this.clearWhiteboard();

    if (!data.paths) return;

    Object.values(data.paths).forEach((path) => {
      if (path.points && path.points.length > 1) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = path.color;
        this.ctx.lineWidth = path.width;

        this.ctx.moveTo(path.points[0].x, path.points[0].y);
        path.points.slice(1).forEach((point) => {
          this.ctx.lineTo(point.x, point.y);
        });

        this.ctx.stroke();
        this.ctx.closePath();
      }
    });
  }

  async clearWhiteboard() {
    if (!this.currentRoom) return;

    try {
      console.log("Clearing whiteboard for room:", this.currentRoom);

      await set(this.pathsRef, null);

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      console.log("Whiteboard cleared successfully");
    } catch (error) {
      console.error("Error clearing whiteboard:", error);
    }
  }

  setupVisibilityHandler() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && this.currentRoom) {
        get(this.pathsRef)
          .then((snapshot) => {
            const pathsData = snapshot.val();
            if (pathsData) {
              this.redrawWhiteboard(pathsData);
            }
          })
          .catch((error) => {
            console.error("Error fetching paths on visibility change:", error);
          });
      }
    });
  }

  saveWhiteboard() {
    const link = document.createElement("a");
    link.download = `whiteboard-${this.currentRoom}-${Date.now()}.png`;
    link.href = this.canvas.toDataURL();
    link.click();
  }
}

const studyRoom = new StudyRoom();
