document.addEventListener("DOMContentLoaded", function () {
  const placeDataStr = sessionStorage.getItem("cafeData");

  if (placeDataStr) {
    try {
      const place = JSON.parse(placeDataStr);

      sessionStorage.removeItem("cafeData");

      document.querySelector("h1").textContent = place.name;

      const ratingContainer = document.querySelector(".rating-container");
      if (ratingContainer) {
        ratingContainer.textContent = place.rating || "N/A";
      }

      const contactLeft = document.querySelector("#cafe-contact-left");
      if (contactLeft) {
        contactLeft.innerHTML = `
            ${place.phoneNumber || "Phone not available"}<br>
            ${place.address || "Address not available"}
          `;
      }

      const contactRight = document.querySelector("#cafe-contact-right");
      if (contactRight && place.website) {
        contactRight.innerHTML = `
            <a href="${place.website}" target="_blank" rel="noopener noreferrer">
              Click here to<br>check the website
            </a>
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
      window.location.href = "index.html";
    }
  } else {
    window.location.href = "index.html";
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
