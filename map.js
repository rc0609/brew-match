const apiKey = "AIzaSyDxYbXeIc-rgRwoRY_QnJJ17O8JdVgUO5E"; // Replace with your API key

const options = {
  enableHighAccuracy: true,
  maximumAge: 0,
};

/**
 * **[ADDED]** Price Level Mapping from string to integer
 */
const PRICE_LEVEL_MAPPING = {
  PRICE_LEVEL_UNSPECIFIED: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
  // PRICE_LEVEL_FREE is handled separately if needed
};

/**
 * Converts a numeric rating into a string of star emojis.
 * @param {number} rating - The rating value (e.g., 4.3).
 * @returns {string} - A string of star emojis representing the rating.
 */
function getEmojiRating(rating) {
  const fullStar = "⭐";
  const emptyStar = "☆";

  // Round the rating to the nearest half
  const roundedRating = Math.round(rating * 2) / 2;

  const fullStars = Math.floor(roundedRating);
  const halfStar = roundedRating - fullStars === 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  return (
    fullStar.repeat(fullStars) +
    (halfStar ? "⭐️" : "") +
    emptyStar.repeat(emptyStars)
  );
}

function success(pos) {
  const crd = pos.coords;

  console.log("Your current position is:");
  console.log(`Latitude : ${crd.latitude}`);
  console.log(`Longitude: ${crd.longitude}`);
  console.log(`More or less ${crd.accuracy} meters.`);
  console.log(pos.coords.latitude);

  let map;
  let markers = []; // Array to store marker instances
  let infoWindow; // Single InfoWindow instance

  /**
   * Initializes the Google Map centered at the user's location.
   */
  function initMap() {
    // Initialize the map
    map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: crd.latitude, lng: crd.longitude },
      zoom: 14,
    });

    // Initialize a single InfoWindow instance
    infoWindow = new google.maps.InfoWindow();

    // Add a marker for the user's location
    const userMarker = new google.maps.Marker({
      position: { lat: crd.latitude, lng: crd.longitude },
      map: map,
      title: "Your Location",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#ffffff",
      },
    });

    // Add click listener to user marker
    userMarker.addListener("click", () => {
      infoWindow.setContent("<strong>Your Location</strong>");
      infoWindow.open(map, userMarker);
    });
  }

  initMap();

  /**
   * Fetches nearby coffee shops using the Google Places API.
   */
  const fetchNearbyPlaces = async () => {
    const url = "https://places.googleapis.com/v1/places:searchNearby";

    const body = {
      includedTypes: ["coffee_shop", "cafe"],
      maxResultCount: 15,
      locationRestriction: {
        circle: {
          center: {
            latitude: crd.latitude,
            longitude: crd.longitude,
          },
          radius: 1500.0,
        },
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": `*`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        displayPlaces(result.places || []);

        // **[ADDED]** Send fetched coffee shops to the backend for storage
        await sendCoffeeShopsToBackend(result.places || []);
      } else {
        displayError(result.error.message || "Failed to fetch nearby places");
      }
    } catch (err) {
      console.error("Error fetching nearby places:", err);
      displayError("An error occurred while fetching nearby places.");
    }
  };

  fetchNearbyPlaces();

  /**
   * **[ADDED]** Sends the fetched coffee shops data to the backend API for storage.
   * @param {Array} places - Array of place objects from the Places API.
   */
  const sendCoffeeShopsToBackend = async (places) => {
    if (places.length === 0) return; // Nothing to send

    // **[MODIFIED]** Extract and structure only the necessary fields for ML with priceLevel as integer
    const structuredPlaces = places.map((place) => ({
      name: place.displayName.text || "Unnamed Coffee Shop",
      location: place.location
        ? {
            latitude: place.location.latitude,
            longitude: place.location.longitude,
          }
        : { latitude: null, longitude: null },
      rating: place.rating || 0.0,
      userRatingCount: place.userRatingCount || 0, // Assuming 'userRatingCount' corresponds to 'user_ratings_total'
      priceLevel: PRICE_LEVEL_MAPPING[place.priceLevel] || 0, // **[MODIFIED]** Mapping priceLevel string to integer
      types: place.types || [],
      formattedAddress: place.formattedAddress || "Address not available",
      businessStatus: place.businessStatus || "UNKNOWN",
      currentOpeningHours: place.currentOpeningHours || {},
      servesCoffee: place.servesCoffee || false,
      servesDessert: place.servesDessert || false,
      takeout: place.takeout || false,
      delivery: place.delivery || false,
      dineIn: place.dineIn || false,
      paymentOptions: place.paymentOptions || {},
      parkingOptions: place.parkingOptions || {},
      accessibilityOptions: place.accessibilityOptions || {},
    }));

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/store-coffee-shops/",
        {
          // **[MODIFIED]** Backend API endpoint
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ coffee_shops: structuredPlaces }), // **[MODIFIED]** Sending the structured data
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to store coffee shops.");
      }

      console.log("Coffee shops successfully stored in the database.");
    } catch (error) {
      console.error("Error storing coffee shops:", error);
      // Optionally display an error message to the user
      const errorDiv = document.getElementById("error");
      errorDiv.textContent = "Failed to store coffee shops in the database.";
    }
  };

  /**
   * Displays the list of coffee shops and adds markers to the map.
   * @param {Array} places - Array of place objects from the Places API.
   */
  const displayPlaces = (places) => {
    const placesList = document.getElementById("places-list");
    const loading = document.getElementById("loading");
    const errorDiv = document.getElementById("error");

    // Clear previous content and markers
    placesList.innerHTML = "";
    clearMarkers();
    loading.style.display = "none";
    errorDiv.textContent = "";

    if (places.length === 0) {
      placesList.innerHTML = "<li>No coffee shops found in this area.</li>";
      return;
    }

    console.log(places);

    places.forEach((place) => {
      // Create list item
      const listItem = document.createElement("li");
      listItem.classList.add("place-item");

      // Place Name
      const name = document.createElement("h2");
      name.classList.add("place-name");
      name.textContent = place.displayName.text || "Unnamed Coffee Shop";
      listItem.appendChild(name);

      // Place Address
      const address = document.createElement("p");
      address.classList.add("place-address");
      address.textContent = place.formattedAddress || "Address not available";
      listItem.appendChild(address);

      // Place Rating
      if (place.rating) {
        // **[MODIFIED]** Check if rating exists before displaying
        const rating = place.rating; // Rating is typically a float between 1 and 5
        const ratingEmojis = getEmojiRating(rating);

        const ratingElement = document.createElement("div");
        ratingElement.classList.add("place-rating");
        ratingElement.textContent = ratingEmojis;

        // Accessibility: Add ARIA label
        ratingElement.setAttribute(
          "aria-label",
          `Rating: ${rating} out of 5 stars`
        );

        listItem.appendChild(ratingElement);
      }

      placesList.appendChild(listItem);

      // Add marker to the map for this place
      if (
        place.location &&
        typeof place.location.latitude === "number" &&
        typeof place.location.longitude === "number"
      ) {
        const marker = new google.maps.Marker({
          position: {
            lat: place.location.latitude,
            lng: place.location.longitude,
          },
          map: map,
          title: place.displayName.text || "Unnamed Coffee Shop",
        });

        // Store the marker for future management (e.g., clearing markers)
        markers.push(marker);

        // Add click listener to open an info window
        marker.addListener("click", () => {
          const contentString = `
              <div>
                <strong>${
                  place.displayName.text || "Unnamed Coffee Shop"
                }</strong><br>
                ${place.formattedAddress || "Address not available"}<br>
                Rating: ${place.rating || "N/A"} ⭐
              </div>
            `;
          infoWindow.setContent(contentString);
          infoWindow.open(map, marker);
        });
      }
    });
  };

  /**
   * Displays an error message to the user.
   * @param {string} message - The error message to display.
   */
  const displayError = (message) => {
    const errorDiv = document.getElementById("error");
    const loading = document.getElementById("loading");
    const placesList = document.getElementById("places-list");

    loading.style.display = "none";
    placesList.innerHTML = "";
    errorDiv.textContent = message;
  };

  /**
   * Clears all markers from the map.
   */
  const clearMarkers = () => {
    markers.forEach((marker) => marker.setMap(null));
    markers = [];
  };
}

function error(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

navigator.geolocation.getCurrentPosition(success, error, options);
