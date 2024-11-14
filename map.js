const apiKey = "AIzaSyDxYbXeIc-rgRwoRY_QnJJ17O8JdVgUO5E";

const options = {
  enableHighAccuracy: true,
  maximumAge: 0,
};

const PRICE_LEVEL_MAPPING = {
  PRICE_LEVEL_UNSPECIFIED: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const CHAIN_STORES = [
  "starbucks",
  "mcdonald",
  "dunkin",
  "costa coffee",
  "caribou coffee",
  "peet's coffee",
  "tim hortons",
  "the coffee bean",
  "tully's coffee",
  "seattle's best coffee",
];

let showOpenOnly = false;
let selectedServices = {
  dineIn: false,
  takeout: false,
  delivery: false,
};
let selectedFoodOptions = {
  breakfast: false,
  dessert: false,
};
let selectedPaymentOptions = {
  creditCards: false,
  nfc: false,
};

let selectedPriceLevel = "all";
let allPlaces = [];
let hideChains = false;
let minimumRating = 0;
let infoWindow;

window.onbeforeunload = function (e) {
  const searchInput = document.getElementById("search-input");
  if (document.activeElement === searchInput) {
    e.preventDefault();
    return false;
  }
};

function getEmojiRating(rating) {
  const fullStar = "⭐";
  const emptyStar = "☆";

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
  let markers = [];

  function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: crd.latitude, lng: crd.longitude },
      zoom: 14,
    });

    infoWindow = new google.maps.InfoWindow();

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

    userMarker.addListener("click", () => {
      infoWindow.setContent("<strong>Your Location</strong>");
      infoWindow.open(map, userMarker);
    });
  }

  function initializeSearch() {
    const searchInput = document.getElementById("search-input");
    const filterChainsBtn = document.getElementById("filter-chains");
    let hasSearched = false;

    filterChainsBtn.addEventListener("click", (e) => {
      hideChains = !hideChains;
      filterChainsBtn.classList.toggle("active");
      filterChainsBtn.textContent = hideChains
        ? "Show All Stores"
        : "Hide Chain Stores";
      filterAndDisplayPlaces();
    });

    let debounceTimeout = null;
    searchInput.addEventListener("input", function (e) {
      if (!hasSearched) {
        hasSearched = true;
        setTimeout(() => {
          const event = new Event("input");
          searchInput.dispatchEvent(event);
        }, 0);
        return;
      }

      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      debounceTimeout = setTimeout(() => {
        const searchTerm = this.value.trim().toLowerCase();
        if (searchTerm.length > 0) {
          fetchPlacesWithSearch(searchTerm);
        } else {
          let filteredPlaces = [...allPlaces];
          if (hideChains) {
            filteredPlaces = filteredPlaces.filter((place) => {
              const placeName = place.displayName.text.toLowerCase();
              return !CHAIN_STORES.some((chain) => placeName.includes(chain));
            });
          }
          displayPlaces(filteredPlaces);
        }
      }, 300);
    });

    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
      }
    });
  }

  function initializeFilters() {
    const filterMain = document.getElementById("filter-main");
    const filterChains = document.getElementById("filter-chains");
    const filterRating = document.getElementById("filter-rating");
    const filterPrice = document.getElementById("filter-price");
    const filterOpen = document.getElementById("filter-open");
    const dropdown = filterMain.parentElement;

    filterMain.addEventListener("click", () => {
      dropdown.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove("active");
      }
    });

    filterPrice.addEventListener("change", (e) => {
      selectedPriceLevel = e.target.value;
      filterAndDisplayPlaces();
    });

    filterOpen.addEventListener("change", (e) => {
      showOpenOnly = e.target.checked;
      filterAndDisplayPlaces();
    });

    filterChains.addEventListener("change", (e) => {
      hideChains = e.target.checked;
      filterAndDisplayPlaces();
    });

    filterRating.addEventListener("change", (e) => {
      minimumRating = parseFloat(e.target.value);
      filterAndDisplayPlaces();
    });

    document
      .getElementById("filter-dine-in")
      .addEventListener("change", (e) => {
        selectedServices.dineIn = e.target.checked;
        filterAndDisplayPlaces();
      });
    document
      .getElementById("filter-takeout")
      .addEventListener("change", (e) => {
        selectedServices.takeout = e.target.checked;
        filterAndDisplayPlaces();
      });
    document
      .getElementById("filter-delivery")
      .addEventListener("change", (e) => {
        selectedServices.delivery = e.target.checked;
        filterAndDisplayPlaces();
      });

    document
      .getElementById("filter-breakfast")
      .addEventListener("change", (e) => {
        selectedFoodOptions.breakfast = e.target.checked;
        filterAndDisplayPlaces();
      });
    document
      .getElementById("filter-dessert")
      .addEventListener("change", (e) => {
        selectedFoodOptions.dessert = e.target.checked;
        filterAndDisplayPlaces();
      });

    document
      .getElementById("filter-credit-cards")
      .addEventListener("change", (e) => {
        selectedPaymentOptions.creditCards = e.target.checked;
        filterAndDisplayPlaces();
      });
    document.getElementById("filter-nfc").addEventListener("change", (e) => {
      selectedPaymentOptions.nfc = e.target.checked;
      filterAndDisplayPlaces();
    });

    document
      .getElementById("clear-filters")
      .addEventListener("click", clearAllFilters);
  }

  function clearAllFilters() {
    hideChains = false;
    minimumRating = 0;
    selectedPriceLevel = "all";
    showOpenOnly = false;
    selectedServices = {
      dineIn: false,
      takeout: false,
      delivery: false,
    };
    selectedFoodOptions = {
      breakfast: false,
      dessert: false,
    };
    selectedPaymentOptions = {
      creditCards: false,
      nfc: false,
    };

    document.getElementById("filter-chains").checked = false;
    document.getElementById("filter-rating").value = "0";
    document.getElementById("filter-price").value = "all";
    document.getElementById("filter-open").checked = false;
    document.getElementById("filter-dine-in").checked = false;
    document.getElementById("filter-takeout").checked = false;
    document.getElementById("filter-delivery").checked = false;
    document.getElementById("filter-breakfast").checked = false;
    document.getElementById("filter-dessert").checked = false;
    document.getElementById("filter-credit-cards").checked = false;
    document.getElementById("filter-nfc").checked = false;

    filterAndDisplayPlaces();
  }

  function filterAndDisplayPlaces() {
    const searchInput = document.getElementById("search-input");
    const searchTerm = searchInput.value.toLowerCase().trim();

    if (searchTerm.length > 0) {
      fetchPlacesWithSearch(searchTerm);
    } else {
      let filteredPlaces = [...allPlaces];
      if (hideChains) {
        filteredPlaces = filteredPlaces.filter((place) => {
          const placeName = place.displayName.text.toLowerCase();
          return !CHAIN_STORES.some((chain) => placeName.includes(chain));
        });
      }

      if (minimumRating > 0) {
        filteredPlaces = filteredPlaces.filter(
          (place) => (place.rating || 0) >= minimumRating
        );
      }

      if (selectedPriceLevel !== "all") {
        filteredPlaces = filteredPlaces.filter(
          (place) => place.priceLevel === selectedPriceLevel
        );
      }

      if (showOpenOnly) {
        filteredPlaces = filteredPlaces.filter(
          (place) => place.currentOpeningHours?.openNow
        );
      }

      if (selectedServices.dineIn) {
        filteredPlaces = filteredPlaces.filter((place) => place.dineIn);
      }

      if (selectedServices.takeout) {
        filteredPlaces = filteredPlaces.filter((place) => place.takeout);
      }

      if (selectedServices.delivery) {
        filteredPlaces = filteredPlaces.filter((place) => place.delivery);
      }

      if (selectedFoodOptions.breakfast) {
        filteredPlaces = filteredPlaces.filter(
          (place) => place.servesBreakfast
        );
      }

      if (selectedFoodOptions.dessert) {
        filteredPlaces = filteredPlaces.filter((place) => place.servesDessert);
      }

      if (selectedPaymentOptions.creditCards) {
        filteredPlaces = filteredPlaces.filter(
          (place) => place.paymentOptions?.acceptsCreditCards
        );
      }

      if (selectedPaymentOptions.nfc) {
        filteredPlaces = filteredPlaces.filter(
          (place) => place.paymentOptions?.acceptsNfc
        );
      }

      displayPlaces(filteredPlaces);
    }
  }

  const fetchPlacesWithSearch = async (searchTerm) => {
    const url = "https://places.googleapis.com/v1/places:searchText";
    const loading = document.getElementById("loading");
    loading.style.display = "block";

    const body = {
      textQuery: `${searchTerm} coffee shop`,
      locationBias: {
        circle: {
          center: {
            latitude: crd.latitude,
            longitude: crd.longitude,
          },
          radius: 50000.0,
        },
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "*",
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        allPlaces = result.places || [];

        let displayResults = [...allPlaces];
        if (hideChains) {
          displayResults = displayResults.filter((place) => {
            const placeName = place.displayName.text.toLowerCase();
            return !CHAIN_STORES.some((chain) => placeName.includes(chain));
          });
        }

        if (minimumRating > 0) {
          displayResults = displayResults.filter(
            (place) => (place.rating || 0) >= minimumRating
          );
        }

        await sendCoffeeShopsToBackend(allPlaces);
        displayPlaces(displayResults);
      } else {
        displayError(result.error.message || "Failed to fetch places");
      }
    } catch (err) {
      console.error("Error fetching places:", err);
      displayError("An error occurred while fetching places.");
    } finally {
      loading.style.display = "none";
    }
  };

  const fetchNearbyPlaces = async () => {
    const url = "https://places.googleapis.com/v1/places:searchNearby";
    const loading = document.getElementById("loading");
    loading.style.display = "block";

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
          "X-Goog-FieldMask": "*",
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        const places = result.places || [];
        allPlaces = places;
        displayPlaces(places);
        await sendCoffeeShopsToBackend(places);
        return true;
      } else {
        displayError(result.error.message || "Failed to fetch nearby places");
        return false;
      }
    } catch (err) {
      console.error("Error fetching nearby places:", err);
      displayError("An error occurred while fetching nearby places.");
      return false;
    } finally {
      loading.style.display = "none";
    }
  };

  async function initialize() {
    try {
      initMap();
      const success = await fetchNearbyPlaces();

      if (success) {
        initializeSearch();
        initializeFilters();
      }
    } catch (error) {
      console.error("Initialization error:", error);
      displayError("Failed to initialize the application.");
    }
  }

  const sendCoffeeShopsToBackend = async (places) => {
    if (places.length === 0) return;

    const structuredPlaces = places.map((place) => ({
      id: place.id,
      name: place.displayName.text || "Unnamed Coffee Shop",
      location: place.location
        ? {
            latitude: place.location.latitude,
            longitude: place.location.longitude,
          }
        : { latitude: null, longitude: null },
      rating: place.rating || 0.0,
      userRatingCount: place.userRatingCount || 0,
      priceLevel: PRICE_LEVEL_MAPPING[place.priceLevel] || 0,
      types: place.types || [],
      formattedAddress: place.formattedAddress || "Address not available",
      businessStatus: place.businessStatus || "UNKNOWN",
      currentOpeningHours: place.currentOpeningHours || {},
      servesCoffee: place.servesCoffee || false,
      servesDessert: place.servesDessert || false,
      servesBreakfast: place.servesBreakfast || false,
      liveMusic: place.liveMusic || false,
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
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ coffee_shops: structuredPlaces }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to store coffee shops.");
      }

      console.log("Coffee shops successfully stored in the database.");
    } catch (error) {
      console.error("Error storing coffee shops:", error);
      const errorDiv = document.getElementById("error");
      errorDiv.textContent = "Failed to store coffee shops in the database.";
    }
  };

  async function fetchStorePopularTimes(placeId, infoWindow, marker, place) {
    try {
      const response = await fetch(
        `https://api.app.outscraper.com/maps/search-v3?query=${encodeURIComponent(
          placeId
        )}&limit=1&async=false`,
        {
          headers: {
            "X-API-KEY":
              "NmQ1NjA3NjE2Yjc1NDFjYWIwMzg4N2IzNzhhMDMwNTl8YjQzNzI5YjY1MA",
          },
        }
      );

      const data = await response.json();

      console.log("API Response for", place.displayName.text + ":", data);

      console.log("Store Data:", data?.data?.[0]?.[0]);
      console.log("Popular Times:", data?.data?.[0]?.[0]?.popular_times);

      if (data?.data?.[0]?.[0]) {
        const storeData = data.data[0][0];

        const now = new Date();
        const currentDay = now.getDay();
        const currentHour = now.getHours();

        const todayPopularTimes = storeData.popular_times?.find(
          (day) => day.day === currentDay
        );
        const currentHourData = todayPopularTimes?.popular_times?.find(
          (time) => time.hour === currentHour
        );

        const getGaugeFillClass = (percentage) => {
          if (percentage <= 25) return "gauge-fill-low";
          if (percentage <= 50) return "gauge-fill-medium";
          if (percentage <= 75) return "gauge-fill-high";
          return "gauge-fill-very-high";
        };

        const createPopularityGauge = (percentage, title) => `
          <div class="popularity-gauge">
            <div class="gauge-bar">
              <div class="gauge-fill ${getGaugeFillClass(
                percentage
              )}" style="width: ${percentage}%"></div>
            </div>
            <span class="gauge-percentage">${percentage}%</span>
          </div>
          <div class="gauge-title">${title}</div>
        `;

        const currentTimeIndex =
          todayPopularTimes?.popular_times?.findIndex(
            (time) => time.hour === currentHour
          ) || 0;
        const nextHours =
          todayPopularTimes?.popular_times?.slice(
            currentTimeIndex,
            currentTimeIndex + 4
          ) || [];

        const contentString = `
          <div class="info-window-container">
            <div class="info-window-title">${place.displayName.text}</div>
            <div class="info-window-address">${place.formattedAddress}</div>
            
            <div class="popularity-section">
              <div class="popularity-header">Current Popularity:</div>
              ${
                currentHourData
                  ? createPopularityGauge(
                      currentHourData.percentage,
                      currentHourData.title
                    )
                  : "No current data available"
              }
            </div>
  
            ${
              nextHours.length > 0
                ? `
              <div class="upcoming-hours">
                <div class="popularity-header">Upcoming Hours:</div>
                ${nextHours
                  .map(
                    (hour) => `
                  <div class="hour-slot">
                    <div class="hour-label">${hour.hour}:00</div>
                    ${createPopularityGauge(hour.percentage, hour.title)}
                  </div>
                `
                  )
                  .join("")}
              </div>
            `
                : ""
            }
  
            ${
              place.currentOpeningHours
                ? `
              <div class="working-hours">
                <strong>Hours:</strong> ${
                  place.currentOpeningHours.weekdayDescriptions[now.getDay()]
                }
              </div>
            `
                : ""
            }
          </div>
        `;

        infoWindow.setContent(contentString);
      } else {
        infoWindow.setContent(`
          <div class="info-window-container">
            <div class="info-window-title">Error loading store information</div>
          </div>
        `);
      }
    } catch (error) {
      console.error("Error fetching store data:", error);
      infoWindow.setContent(`
        <div class="info-window-container">
          <div class="info-window-title">Error loading store information</div>
        </div>
      `);
    }
  }

  const displayPlaces = (places) => {
    const placesList = document.getElementById("places-list");
    const loading = document.getElementById("loading");
    const errorDiv = document.getElementById("error");

    placesList.innerHTML = "";
    clearMarkers();
    loading.style.display = "none";
    errorDiv.textContent = "";

    if (places.length === 0) {
      placesList.innerHTML =
        "<li class='place-item'>No coffee shops found matching your search.</li>";
      return;
    }

    places.forEach((place) => {
      const listItem = document.createElement("li");
      listItem.classList.add("place-item");

      const name = document.createElement("h2");
      name.classList.add("place-name");
      name.textContent = place.displayName.text || "Unnamed Coffee Shop";
      listItem.appendChild(name);

      const address = document.createElement("p");
      address.classList.add("place-address");
      address.textContent = place.formattedAddress || "Address not available";
      listItem.appendChild(address);

      if (place.rating) {
        const ratingEmojis = getEmojiRating(place.rating);
        const ratingElement = document.createElement("div");
        ratingElement.classList.add("place-rating");
        ratingElement.textContent = `${ratingEmojis} (${place.rating})`;
        ratingElement.setAttribute(
          "aria-label",
          `Rating: ${place.rating} out of 5 stars`
        );
        listItem.appendChild(ratingElement);
      }

      // Add View Details button
      const detailsButton = document.createElement("button");
      detailsButton.classList.add("view-details-btn");
      detailsButton.textContent = "View Details";
      detailsButton.onclick = (e) => {
        e.stopPropagation(); // Prevent triggering the list item click
        navigateToCafePage(place);
      };
      listItem.appendChild(detailsButton);

      listItem.addEventListener("click", () => {
        if (place.location) {
          const position = {
            lat: place.location.latitude,
            lng: place.location.longitude,
          };
          map.setCenter(position);
          map.setZoom(16);

          const marker = markers.find(
            (m) =>
              m.getPosition().lat() === position.lat &&
              m.getPosition().lng() === position.lng
          );
          if (marker) {
            google.maps.event.trigger(marker, "click");
          }
        }
      });

      placesList.appendChild(listItem);

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
          animation: google.maps.Animation.DROP,
        });

        markers.push(marker);

        marker.addListener("click", () => {
          const initialContent = `
            <div class="loading-container">
              <div class="loading-text">Loading store information...</div>
              <div class="loading-spinner"></div>
            </div>
          `;

          infoWindow.setContent(initialContent);
          infoWindow.open(map, marker);

          fetchStorePopularTimes(place.id, infoWindow, marker, place);
        });
      }
    });

    console.log(places);

    if (markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((marker) => bounds.extend(marker.getPosition()));

      if (markers.length === 1) {
        map.setCenter(markers[0].getPosition());
        map.setZoom(17);
      } else {
        map.fitBounds(bounds);
        google.maps.event.addListenerOnce(map, "bounds_changed", () => {
          if (map.getZoom() > 16) {
            map.setZoom(16);
          }
        });
      }
    }
  };

  function navigateToCafePage(place) {
    // Encode the place data to safely pass in URL
    const placeData = {
      id: place.id,
      name: place.displayName.text,
      address: place.formattedAddress,
      rating: place.rating,
      totalRatings: place.userRatingCount,
      priceLevel: place.priceLevel,
      phoneNumber: place.internationalPhoneNumber,
      website: place.websiteUri,
      currentOpeningHours: place.currentOpeningHours,
      location: place.location,
    };

    // Encode the data to pass safely in URL
    const encodedData = encodeURIComponent(JSON.stringify(placeData));

    // Navigate to cafe page with data
    window.location.href = `cafe.html?placeData=${encodedData}`;
  }

  const displayError = (message) => {
    const errorDiv = document.getElementById("error");
    const loading = document.getElementById("loading");
    const placesList = document.getElementById("places-list");

    loading.style.display = "none";
    placesList.innerHTML = "";
    errorDiv.textContent = message;
  };

  const clearMarkers = () => {
    markers.forEach((marker) => marker.setMap(null));
    markers = [];
  };

  initialize();
}

function error(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

navigator.geolocation.getCurrentPosition(success, error, options);
