addEventListener("load", main);

/* --------------- CONSTANTS --------------- */

const MAX_SPEED = 10;
const DISPLAY_NAMES = [
  "Motorkraft",
  "Körtid",
  "Besökta noder",
  "Styrkö",
  "Avstånd till hinder",
  "Avstånd till mitt",
  "Avstånd till v. kant",
  "Avstånd till h. kant",
  "Rutt",
  "Hastighet",
];

// här har vi destinationer upp till D, ändra sedan till hur många det faktiskt ska vara hehe
const VALID_DESTINATIONS = /^[A-D]+(?:[A-D]+)*$/;

const STEERING_COMMANDS = { 37: "left", 38: "up", 39: "right", 40: "none" };

const INITIAL_LOCK_DATA = {
  writing_lock: false,
  reading_lock: false,
};

/* --------------- FUNCTIONS FOR FETCHING DATA --------------- */

async function fetch_file_content(path) {
  while (true) {
    console.log("trying to fetch file...");
    try {
      let response = await fetch(path);
      let raw_data = await response.json();
      return raw_data;
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }
  }
}

async function fetch_img_content(path) {
  let response = await fetch(path);
  let image = await response.blob();
  return image;
}

/* --------------- MAIN FUNCTION --------------- */

async function main() {
  removeEventListener("load", main);

  // INITIALISE FILES
  edit_locks(INITIAL_LOCK_DATA);

  // LOAD CONTENT FROM JSON FILES
  let input = await fetch_file_content("../IO/input.json");
  let output = await fetch_file_content("../IO/output.json");

  // SETUP

  const listen_for_directions = async (event) => {
    output["steering_command"] = STEERING_COMMANDS[event.keyCode];
    await edit_output(output);
  };
  let current_speed = document.getElementById("current_speed");
  current_speed.innerHTML = output["speed"];
  let car_cam = document.getElementById("car_cam");
  car_cam.src = "../IO/out_img.jpg";
  update_controls(output);
  output["steering_command"] = "none";
  switch_to_manual_mode(output, listen_for_directions);

  // EVENTLISTENER ON CONTROL CHANGES
  let exec_button = document.querySelector("#exec_button");
  exec_button.addEventListener("click", () => {
    change_controls(output);
  });

  // EVENTLISTENER ON SPEED CHANGES
  let speed_buttons = document.querySelector("#speed_buttons");
  speed_buttons.addEventListener("click", () => {
    change_speed(output, document.activeElement.id);
  });

  // EVENTLISTENER ON STEERING CHANGES
  let manual_button = document.querySelector("#man");
  let auto_button = document.querySelector("#auto");
  manual_button.addEventListener("click", () => {
    switch_to_manual_mode(output, listen_for_directions);
  });
  auto_button.addEventListener("click", () => {
    switch_to_auto_mode(output, listen_for_directions); //event.target
  });

  // UPDATE STATUS-BOX CONTENT
  update_status(input);
}

/* --------------- FUNCTIONS FOR LOCKING/UNLOCKING DATA --------------- */

async function wait_for_lock() {
  let lock = await fetch_file_content("../IO/lock.json");
  while (lock["writing_lock"] == true) {
    console.log("we are locked");
    // kolla på låset igen
    lock = await fetch_file_content("../IO/lock.json");
  }
  return lock;
}

async function lock_file(lock) {
  console.log("LOCKING");
  lock["reading_lock"] = true;
  await edit_locks(lock);
}

async function unlock_file(lock) {
  console.log("UNLOCKING:");
  console.log(lock["reading_lock"]);

  console.log(lock);
  lock["reading_lock"] = false;
  await edit_locks(lock);
}

/* --------------- FUNCTIONS FOR DISPLAYING DATA (INPUT) --------------- */

function update_status(input) {
  let status_params = document.getElementById("status");
  let params = status_params.children;

  for (var i = 1; i < params.length; i++) {
    var param = params[i].id.toString();
    params[i].innerHTML = DISPLAY_NAMES[i - 1] + ": " + input[param];
  }
}

function update_controls(output) {
  let status_params = document.getElementById("controls_div").children;
  for (var i = 0; i < status_params.length; i++) {
    let params = status_params[i];
    if (params.children.length > 1) {
      let params_output = params.children[1];
      params_output.innerHTML =
        "(Nuvarande värde: " + output[params_output.id] + ")";
    }
  }
}

/* --------------- FUNCTIONS FOR CHANGING DATA (OUTPUT) --------------- */

async function change_controls(output) {
  //getting all children of the controlsDiv
  let controls = document.getElementById("controls_div").children;
  let updated_output_data = output;
  //get all children for every child = "grandchildren" of the controlsDiv :D
  for (var i = 0; i < controls.length; i++) {
    let control = controls[i];
    if (control.children.length > 1) {
      //getting the input from the textbox
      let control_input_id = control.children[2].id;
      let control_input = document.getElementById(control_input_id).value;
      //only updates JSON when we have written something
      if (control_input != "") {
        // wait for lock and lock file
        let lock = await wait_for_lock();
        await lock_file(lock);
        //reglerparametrar ska vara en Float
        if (i < 3 && parseFloat(control_input)) {
          updated_output_data[control.children[1].id] = control_input;
        }
        //karta ska preliminärt vara en Int som är mellan 0 och 3
        else if (i == 3 && parseInt(control_input) < 4) {
          updated_output_data[control.children[1].id] = control_input;
        }
        //köruppdrag skrivs på formen ABCD
        else if (i == 4 && VALID_DESTINATIONS.test(control_input)) {
          updated_output_data[control.children[1].id] = control_input;
        }
        await edit_output(updated_output_data);
        update_controls(output);
        lock = await fetch_file_content("../IO/lock.json");
        await unlock_file(lock);
      }
      //clear textbox
      document.getElementById(control_input_id).value = "";
    } else {
      console.error(
        "Control element with index " + i + " does not have a second child."
      );
    }
  }
}

async function change_speed(output, id) {
  // wait for lock and lock file
  let lock = await wait_for_lock();
  await lock_file(lock);
  let current_speed = document.getElementById("current_speed");
  let speed = Number(output["speed"]);
  if (id == "inc_speed" && speed < MAX_SPEED) {
    speed += 1;
  } else if (id == "dec_speed" && speed > 0) {
    speed -= 1;
  }
  output["speed"] = speed;
  await edit_output(output);
  current_speed.innerHTML = speed;
  await unlock_file(lock);
}

/* These two following functions are almost exactly the same, but due to issues
with identifying the selected button, they are separated */
async function switch_to_manual_mode(output, listen_for_directions) {
  // wait for lock and lock file
  let lock = await wait_for_lock();
  await lock_file(lock);
  output["manual_steering"] = true;
  await edit_output(output);
  await unlock_file(lock);
  activate_button_visually("man", "auto");
  alert(
    "Du styr nu bilen manuellt med piltangenterna (upp = rakt fram, ned = stanna)."
  );
  document.addEventListener("keydown", listen_for_directions);
}
async function switch_to_auto_mode(output, listen_for_directions) {
  // wait for lock and lock file
  let lock = await wait_for_lock();
  await lock_file(lock);
  output["manual_steering"] = false;
  output["steering_command"] = "none";
  await edit_output(output);
  await unlock_file(lock);
  activate_button_visually("auto", "man");
  alert("Bilen styrs nu autonomt.");
  document.removeEventListener("keydown", listen_for_directions);
}

function activate_button_visually(active_button_id, inactive_button_id) {
  let active_button = document.getElementById(active_button_id);
  let inactive_button = document.getElementById(inactive_button_id);
  active_button.style.background = "#8c9a64";
  inactive_button.style.background = "#e1eedd";
}

/* --------------- FUNCTIONS FOR CHANGING JSON-FILES --------------- */

async function edit_output(data) {
  fetch("http://localhost:5000/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok: " + response.statusText);
      }
      console.log("POST REQ MADE");
      console.log(response);
      return response.body;
    })
    .then((result) => {
      console.log(result);
    })
    .catch((err) => {
      console.log(err);
    });
}

async function edit_locks(data) {
  try {
    console.log("DATA: ");
    console.log(data);

    const response = await fetch("http://localhost:5000/lock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok: " + response.statusText);
    }

    console.log("LOCK REQ MADE");

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const result = await response.json(); // Parse response body as JSON
      console.log(result);
    } else {
      const result = await response.text(); // Parse response body as text
      console.log(result);
    }
  } catch (err) {
    console.error(err);
  }
}
