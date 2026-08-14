document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginToggle = document.getElementById("login-toggle");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeLoginButton = document.getElementById("close-login");
  const teacherStatus = document.getElementById("teacher-status");

  let isTeacherLoggedIn = false;

  async function refreshAuthState() {
    try {
      const response = await fetch("/session");
      const data = await response.json();
      isTeacherLoggedIn = data.logged_in;

      signupForm.classList.toggle("hidden", !isTeacherLoggedIn);
      teacherStatus.classList.toggle("hidden", isTeacherLoggedIn);

      if (isTeacherLoggedIn) {
        loginToggle.textContent = `👤 ${data.username}`;
        teacherStatus.textContent = `Logged in as ${data.username}. Teacher controls are enabled.`;
      } else {
        loginToggle.textContent = "👤 Teacher";
        teacherStatus.textContent = "Teacher login required to manage signups.";
      }
    } catch (error) {
      console.error("Error fetching session state:", error);
    }
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => {
                    const deleteButton = isTeacherLoggedIn
                      ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                      : "";
                    return `<li><span class="participant-email">${email}</span>${deleteButton}</li>`;
                  })
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        await fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        await fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  loginToggle.addEventListener("click", () => {
    if (isTeacherLoggedIn) {
      fetch("/logout", { method: "POST" })
        .then(async () => {
          await refreshAuthState();
          await fetchActivities();
          showMessage("Logged out", "success");
        })
        .catch(() => {
          showMessage("Failed to log out.", "error");
        });
      return;
    }

    loginModal.classList.remove("hidden");
    loginModal.setAttribute("aria-hidden", "false");
  });

  closeLoginButton.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginModal.setAttribute("aria-hidden", "true");
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);

    try {
      const response = await fetch("/login", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        loginModal.classList.add("hidden");
        loginForm.reset();
        await refreshAuthState();
        await fetchActivities();
        showMessage(result.message, "success");
      } else {
        showMessage(result.detail || "Login failed.", "error");
      }
    } catch (error) {
      showMessage("Login failed. Please try again.", "error");
      console.error("Login error:", error);
    }
  });

  refreshAuthState();
  fetchActivities();
});
