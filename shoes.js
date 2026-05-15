import { createEmptyState, escapeHtml, formatMileage } from "./utils.js";

export function createShoeId() {
  return `shoe-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getShoeById(shoes, targetShoeId) {
  return shoes.find(function (shoe) {
    return shoe.id === targetShoeId;
  });
}

export function calculateShoeMileage(shoes, runs, targetShoeId) {
  const shoe = getShoeById(shoes, targetShoeId);

  if (!shoe) {
    return 0;
  }

  const runMileage = runs.reduce(function (total, run) {
    if (run.shoeId !== targetShoeId) {
      return total;
    }

    return total + Number(run.distance);
  }, 0);

  return (Number(shoe.startingMileage) || 0) + runMileage;
}

export function updateShoeOptions(shoeSelect, shoes) {
  if (!shoeSelect) {
    return;
  }

  const selectedShoeId = shoeSelect.value;

  shoeSelect.innerHTML = '<option value="">No shoe selected</option>';

  shoes.forEach(function (shoe) {
    const shoeOption = document.createElement("option");

    shoeOption.value = shoe.id;
    shoeOption.textContent = shoe.name;
    shoeSelect.append(shoeOption);
  });

  if (getShoeById(shoes, selectedShoeId)) {
    shoeSelect.value = selectedShoeId;
  }
}

export function renderShoes(options) {
  const shoesContainer = options.shoesContainer;
  const shoeSelect = options.shoeSelect;
  const shoes = options.shoes;
  const runs = options.runs;

  updateShoeOptions(shoeSelect, shoes);

  if (!shoesContainer) {
    return;
  }

  shoesContainer.innerHTML = "";

  if (shoes.length === 0) {
    shoesContainer.innerHTML = createEmptyState("No shoes added yet. Add a shoe to start tracking mileage.");
    return;
  }

  shoes.forEach(function (shoe) {
    const shoeCard = document.createElement("div");
    const shoeMileage = calculateShoeMileage(shoes, runs, shoe.id);

    shoeCard.classList.add("shoe-card");
    shoeCard.innerHTML = `
      <div>
        <h3>${escapeHtml(shoe.name)}</h3>
        <p>${formatMileage(shoeMileage)} miles</p>
      </div>
      <div class="shoe-actions">
        <button class="edit-btn" type="button" data-shoe-action="edit" data-shoe-id="${escapeHtml(shoe.id)}">Edit</button>
        <button class="delete-btn" type="button" data-shoe-action="delete" data-shoe-id="${escapeHtml(shoe.id)}">Delete</button>
      </div>
    `;

    shoesContainer.append(shoeCard);
  });
}
