document.addEventListener("DOMContentLoaded", function () {
  const placeDataStr = sessionStorage.getItem("cafeData");

  if (placeDataStr) {
    try {
      const place = JSON.parse(placeDataStr);

      sessionStorage.removeItem("cafeData");

      document.querySelector("h1").textContent = place.name;

      const ratingContainer = document.querySelector(".rating-container");
      if (ratingContainer) {
        ratingContainer.innerHTML = `
            <p id="rating">${place.rating || "N/A"}</p>
            <i class="fas fa-star"></i>
          `;
      }

      const cafeContactContainer = document.querySelector(
        "#cafe-contact-container"
      );
      if (cafeContactContainer) {
        const openingHours = formatOpeningHours(place.currentOpeningHours);
        cafeContactContainer.innerHTML = `
          <div class="cafe-contact">
            <div id="cafe-contact-left">
              ${place.phoneNumber || "Phone not available"}<br>
              ${place.address || "Address not available"}
            </div>
            
            <div id="cafe-hours">
              <h3>Opening Hours</h3>
              <div class="hours-list">
                ${openingHours}
              </div>
            </div>

            <div id="cafe-contact-right">
              ${
                place.website
                  ? `
                <a href="${place.website}" target="_blank" rel="noopener noreferrer">
                  Click here to<br>check the website
                </a>
              `
                  : "Website not available"
              }
            </div>
          </div>
        `;
      }

      if (place.totalRatings) {
        updateRatingBars(place.rating, place.totalRatings);
      }

      if (place.reviews && place.reviews.length > 0) {
        updateReviews(place.reviews);
      }
    } catch (error) {
      console.error("Error parsing place data:", error);
      window.location.href = "../../index.html";
    }
  } else {
    window.location.href = "../../index.html";
  }
});

function updateRatingBars(rating, totalRatings) {
  const bars = {
    "bar-5": 0.4,
    "bar-4": 0.3,
    "bar-3": 0.2,
    "bar-2": 0.07,
    "bar-1": 0.03,
  };

  Object.entries(bars).forEach(([barId, percentage]) => {
    const bar = document.getElementById(barId);
    if (bar) {
      bar.style.width = `${percentage * 100}%`;
    }
  });

  const reviewCount = document.getElementById("review-count");
  if (reviewCount) {
    reviewCount.textContent = `${totalRatings} reviews`;
  }
}

function updateReviews(reviews) {
  reviews.forEach((review, index) => {
    const boxId = `box${index + 1}`;
    const box = document.getElementById(boxId);

    if (box) {
      const userInfo = box.querySelector(".user-info");
      if (userInfo) {
        let userIconHtml = "";
        if (review.profilePhoto) {
          userIconHtml = `<img src="${review.profilePhoto}" alt="${review.author}" class="user-icon">`;
        } else {
          const initials = review.author.charAt(0).toUpperCase();
          userIconHtml = `
                <div class="user-icon default-icon">
                  <span class="user-initials">${initials}</span>
                </div>
              `;
        }

        userInfo.innerHTML = `
              ${userIconHtml}
              <div class="user-name">${review.author}</div>
              <div class="user-comment">${review.text}</div>
            `;
      }
    }
  });
}

function formatOpeningHours(hours) {
  if (!hours || !hours.weekdayDescriptions) {
    return "<p>Hours not available</p>";
  }

  const today = new Date().getDay();
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return hours.weekdayDescriptions
    .map((description, index) => {
      const isToday = index === today;
      return `
        <div class="hours-row ${isToday ? "current-day" : ""}">
          <span class="day">${daysOfWeek[index]}</span>
          <span class="time">${description.split(": ")[1] || "Closed"}</span>
          ${isToday ? '<span class="today-marker">Today</span>' : ""}
        </div>
      `;
    })
    .join("");
}
