let selectedRating = 0;
const popup = document.getElementById("feedback-popup");
const triggerImg = document.querySelector("#feedback-trigger img");

// toggle popup on trigger click
triggerImg.addEventListener("click", () => {
  const isOpen = popup.style.display === "block";
  popup.style.display = isOpen ? "none" : "block";
});

/**
 * Highlights stars up to the given value
 * @param {number} value - number of stars to highlight
 */
function highlightStars(value) {
  document.querySelectorAll(".star img").forEach((img, index) => {
    img.style.opacity = index < value ? "1" : "0.3";
  });
}

// attach hover and click events to each star
document.querySelectorAll(".star").forEach((star) => {
  const value = parseInt(star.dataset.value);

  // preview rating on hover
  star.addEventListener("mouseover", () => highlightStars(value));

  // reset to selected rating when hover ends
  star.addEventListener("mouseout", () => highlightStars(selectedRating));

  // set selected rating on click
  star.addEventListener("click", () => {
    selectedRating = value;
    highlightStars(selectedRating);
  });
});

//handle submit feedback
document.getElementById("feedback-submit").addEventListener("click", () => {
  if (selectedRating === 0) {
    alert("Please select a rating first!");
    return;
  }
  console.log("Rating submitted:", selectedRating);

  // close popup
  popup.style.display = "none";

  // show thank you overlay
  const overlay = document.getElementById("thankyou-overlay");
  overlay.classList.add("visible");

  // hide after 2 seconds and reset
  setTimeout(() => {
    overlay.classList.remove("visible");
    selectedRating = 0;
    highlightStars(0);
  }, 2000);
});

// initialize all stars as dim on page load
highlightStars(0);
