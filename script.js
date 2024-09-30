document
  .getElementById("switch-to-signup")
  .addEventListener("click", function () {
    document.getElementById("login-form").classList.add("hidden");
    document.getElementById("signup-form").classList.remove("hidden");
  });

document
  .getElementById("switch-to-login")
  .addEventListener("click", function () {
    document.getElementById("signup-form").classList.add("hidden");
    document.getElementById("login-form").classList.remove("hidden");
  });

document.getElementById("go-to-signup").addEventListener("click", function () {
  document.getElementById("login-or-signup").classList.add("hidden");
  document.getElementById("signup-form").classList.remove("hidden");
});

document.getElementById("go-to-login").addEventListener("click", function () {
  document.getElementById("login-or-signup").classList.add("hidden");
  document.getElementById("login-form").classList.remove("hidden");
});
