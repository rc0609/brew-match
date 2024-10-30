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

let allPlaces = [];
let hideChains = false;

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
  let infoWindow;

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
          const contentString = `
            <div>
              <strong>${
                place.displayName.text || "Unnamed Coffee Shop"
              }</strong><br>
              ${place.formattedAddress || "Address not available"}<br>
              ${place.rating ? `Rating: ${getEmojiRating(place.rating)}` : ""}
            </div>
          `;
          infoWindow.setContent(contentString);
          infoWindow.open(map, marker);
        });
      }
    });

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
