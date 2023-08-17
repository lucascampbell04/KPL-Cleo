import './style.css'

let userName;
let userId;
let userSignedIn = false;

const sidebar = document.getElementById('application-sidebar');
const newChatInput = document.getElementById("newinput");
const optionsDiv = document.getElementById("options");
const dashboardButton = document.getElementById("dashboard-button");
const newButton = document.getElementById("new-button");
const saveButton = document.getElementById("save-button");
const startConversationButton = document.getElementById("startConversation");
const addToDashboardButton = document.getElementById("addToDashboard");
const chatContainer = document.getElementById("chatContainer");
const sendChatButton = document.getElementById("sendChat");
const textRadio = document.getElementById("text-radio");
const barGraphRadio = document.getElementById("bargraph-radio");
const lineGraphRadio = document.getElementById("linegraph-radio");
const pieChartRadio = document.getElementById("piechart-radio");
const tableRadio = document.getElementById("table-radio");
const fileImportButton = document.getElementById("fileImport");
const attachFileButton = document.getElementById("attachFile");
const signInForm = document.querySelector("#signin form");
const signInButton = document.getElementById("signin-button");
const signInIcon = document.getElementById("signInIcon");
const signOutIcon = document.getElementById("signOutIcon");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const emailError = document.querySelector("#email-error");
const passwordError = document.querySelector("#password-error");
const workInProgressButton = document.getElementById('workInProgress');

let greetingText = document.getElementById('greetingText');
let currentMessageType = "text";
let currentChatId;

dashboardButton.addEventListener('click', showDashboard);

newButton.addEventListener('click', showNewChat);

signInButton.addEventListener('click', async () => {
  if (userSignedIn) {
    try {
      const response = await fetch('/signout', {
        method: 'POST',
        credentials: 'same-origin', // Important: Send cookies
      });

      if (response.ok) {
        // Handle successful sign-out
        console.log('Signed out successfully');
        Toastify({
          text: 'Signed out successfully! Redirecting...',
          duration: 2000, // Display duration in milliseconds
          newWindow: true, // Open the toast in a new window/tab
          gravity: "top", // Position of the toast (top, bottom, left, right)
          position: "center", // Toast position within the gravity (center, left, right)
          backgroundColor: "#4CAF50", // Light green background color
          stopOnFocus: true, // Stop the toast from disappearing on focus
          className: "custom-toast", // Add a custom CSS class for additional styling
          // Additional options can be added here
        }).showToast(); 
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        // Handle sign-out error
        console.error('Error signing out');
      }
    } catch (error) {
      console.error('An error occurred while signing out', error);
    }
  } else {
    showSignIn();
  }
});


sendChatButton.addEventListener("click", sendChat);

textRadio.addEventListener('click', function() {
  currentMessageType = "text";
  console.log("Text format")
})

barGraphRadio.addEventListener('click', function() {
  currentMessageType = "barGraph";
  console.log("Bar graph format")
})

lineGraphRadio.addEventListener('click', function() {
  currentMessageType = "lineGraph";
  console.log("Line graph format")
})

pieChartRadio.addEventListener('click', function() {
  currentMessageType = "pieChart";
  console.log("Pie chart format")
})

tableRadio.addEventListener('click', function() {
  currentMessageType = "table";
  console.log("Table format")
})

fileImportButton.addEventListener('click', function() {
  const fileInput = document.getElementById('fileInput');
  fileInput.click();
});

attachFileButton.addEventListener('click', function() {
  const fileAttachInput = document.getElementById('fileAttachInput');
  fileAttachInput.click();
});

workInProgressButton.addEventListener('click', function() {
showToastifyWIP();
});

document.getElementById('fileAttachInput').addEventListener('change', async function() {
  const file = this.files[0];
  console.log(file);
  if (!file) {
    alert('Please select a file before uploading.');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/convert', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('File conversion failed.');
    }
    const text = await response.text();
    await sendChat(true, text, file.name);
  } catch (error) {
    console.error('Error uploading file:', error);
  }
});

document.getElementById('fileInput').addEventListener('change', async function() {
  const file = this.files[0];
  console.log(file);
  if (!file) {
    alert('Please select a file before uploading.');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/convert', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('File conversion failed.');
    }
    const text = await response.text();
    showChat();
    await startNewChat(true, text, file.name);
    deleteLoadingElement();
  } catch (error) {
    console.error('Error uploading file:', error);
  }
});

startConversationButton.addEventListener("click", async function () {
  showChat();
  await startNewChat();
  deleteLoadingElement();
});

newChatInput.addEventListener('keydown', async function (event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();

    showChat();
    await startNewChat();
    deleteLoadingElement();
  }
});

newChatInput.addEventListener('keydown', function (event) {
  if (event.key === 'Enter' && event.shiftKey) {
    event.preventDefault();
    const currentValue = newChatInput.value;
    newChatInput.value = currentValue + '\n';
  }
});

newChatInput.addEventListener("input", () => {
  if (newChatInput.value.trim().length > 0) {
    // Slide down and fade in the optionsDiv
    optionsDiv.style.transform = "translateY(0)";
    optionsDiv.style.opacity = "1";
    optionsDiv.style.pointerEvents = "auto"; // Enable pointer events when shown
  } else {
    // Slide up and fade out the optionsDiv
    optionsDiv.style.transform = "translateY(-50px)";
    optionsDiv.style.opacity = "0";
    optionsDiv.style.pointerEvents = "none"; // Disable pointer events when hidden
  }
});

signInForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  
  const email = document.querySelector("#email").value;
  const password = document.querySelector("#password").value;
  const rememberMe = document.querySelector("#remember-me").checked;

  try {
    const response = await fetch("/signin", {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        rememberMe,
      }),
    });

    if (response.ok) {
      userSignedIn = true;
      const { name } = await response.json()
      greetingText.textContent = `Hello, ${name}`
      Toastify({
        text: 'Signed in successfully! Redirecting...',
        duration: 2000, // Display duration in milliseconds
        newWindow: true, // Open the toast in a new window/tab
        gravity: "top", // Position of the toast (top, bottom, left, right)
        position: "center", // Toast position within the gravity (center, left, right)
        backgroundColor: "#4CAF50", // Light green background color
        stopOnFocus: true, // Stop the toast from disappearing on focus
        className: "custom-toast", // Add a custom CSS class for additional styling
        // Additional options can be added here
      }).showToast();    
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      setTimeout(() => {
        // Add the 'spin' class to both icons to trigger the spin animation
        signInIcon.classList.add("spin");
        signOutIcon.classList.add("spin");
      
        // Set a timeout to remove the 'spin' class after the animation is complete
        setTimeout(() => {
          signInIcon.classList.remove("spin");
          signInIcon.classList.add("hidden");
          signOutIcon.classList.remove("spin");
          signOutIcon.classList.remove("hidden");
          signInButton.querySelector('span').textContent = "Sign out";
        }, 300); // Adjust the duration based on your animation duration
      }, 2000);
    } else {
      // Handle failed sign-in attempt
      console.error("Sign-in failed");
      // Display a toast notification with the response JSON
      Toastify({
        text: 'Incorrect email or password.',
        duration: 3500, // Display duration in milliseconds
        newWindow: true, // Open the toast in a new window/tab
        gravity: "top", // Position of the toast (top, bottom, left, right)
        position: "center", // Toast position within the gravity (center, left, right)
        backgroundColor: "red", // Light green background color
        stopOnFocus: true, // Stop the toast from disappearing on focus
        className: "custom-toast", // Add a custom CSS class for additional styling
        // Additional options can be added here
      }).showToast();     
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
});


async function startNewChat(fromFile, text, fileName) {
  if (!newChatInput.value.trim().length > 0 && fromFile === false) {
    console.log("Conversation cancelled: Length is not greater than 0.");
    return;
  }
  let chatMessage = newChatInput.value.trim();
  chatContainer.innerHTML = '';

  if (fromFile === true)  {
    chatMessage = text;
    createUserFileElement(fileName)
  } else {
    createUserChatElement(chatMessage);
  }

  setTimeout(() => {
    createLoadingElement();
  }, 500);
  try {
    const response = await fetch("/chat", {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: chatMessage,
        messageType: "text",
        fromFile: fromFile,
        fileName: fileName
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch from server.");
    }

    const data = await response.json();
    let newChatId = data.chatId;
    currentChatId = newChatId;
    let chatTitle;

  if (fromFile) {
    chatTitle = 'File: ' + fileName;
  } else {
    chatTitle = chatMessage;
  }
  if (chatTitle.length > 20) {
    chatTitle = chatTitle.substring(0, 20) + "...";
  }
    // Create and append the new <li> element to the sidebar
    const sidebarList = document.getElementById('chats');
    const li = document.createElement('li');
    li.innerHTML = `
      <a data-chatid="${newChatId} id="${currentChatId}" class="flex items-center gap-x-3 py-2 px-3 text-sm text-slate-700 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-300 transition-all duration-300" href="javascript:;">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"></path>
        </svg>
        ${chatTitle}
      </a>
    `;
    li.addEventListener('click', () => {
      currentChatId = newChatId;
      fetchAndRenderConversation(newChatId);
      console.log('function called with chatid of ', newChatId);
    });
    const desiredIndex = 0; // Change this to the desired index
    const existingChatElements = Array.from(sidebarList.childNodes);
    
    if (existingChatElements.length >= desiredIndex) {
      sidebarList.insertBefore(li, existingChatElements[desiredIndex]);
    } 
    console.log('chatId assigned to', currentChatId);
    createAIChatElement(data.reply);
  } catch (error) {
    console.error(error);
  }
}

chatbox.addEventListener('keydown', async function (event) {
  if (event.key === 'Enter' && !event.shiftKey) {
sendChat();
  }
});

chatbox.addEventListener('keydown', function (event) {
  if (event.key === 'Enter' && event.shiftKey) {
    event.preventDefault();
    const currentValue = chatbox.value;
    chatbox.value = currentValue + '\n';
  }
});

async function sendChat(fromFile, text, fileName) {
  const chatbox = document.getElementById('chatbox');
  if (!chatbox.value) {
    showToastifyError('Please type a message or upload a file.');
    return;
  }
  const message = chatbox.value.trim();
  let chatMessage = message;
  chatbox.value = '';
  if (fromFile === true)  {
    chatMessage = text;
    createUserFileElement(fileName)
  } else {
    createUserChatElement(chatMessage);
  }
  scrollToBottom();

  if (!message.length > 0 && fromFile === false) {
    console.log('Length not valid');
    return;
  }
  setTimeout(() => {
    createLoadingElement();
    scrollToBottom();
  }, 500);
  try {
    const response = await fetch("/chat", {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: chatMessage,
        messageType: "text",
        chatId: currentChatId,
        fromFile: fromFile,
        fileName: fileName
      }),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch from server.");
    }

    const data = await response.json();
    createAIChatElement(data.reply);
  } catch (error) {
    console.error(error);
  }
  deleteLoadingElement();
  scrollToBottom();
}

function deleteLoadingElement() {
  document.getElementById('loading_element').remove();
}

function createLoadingElement()  {
  const li = document.createElement('li');
  li.id = "loading_element";
  li.className = "max-w-4xl py-2 px-4 sm:px-6 lg:px-8 mx-auto flex gap-x-2 sm:gap-x-4";
  li.innerHTML = `
  <!-- Chat Bubble -->
      <!-- Replace this part with your SVG code -->
      <img class="flex-shrink-0 w-[2.375rem] h-[2.375rem]" width="38" height="38" src="kpl-logo.png"></img>
      <div class="grow max-w-[90%] md:max-w-2xl w-full space-y-3 flex items-center">
        <!-- Chat -->
        <div>
        <div class="typing">
        <span class="circle scaling"></span>
        <span class="circle scaling"></span>
        <span class="circle scaling"></span>
      </div>
        </div>
        <!-- End Chat -->
    </div>
  <!-- End Chat Bubble -->`
  chatContainer.appendChild(li);
}

function createUserChatElement(content)  {
  const li = document.createElement('li');
  li.className = "max-w-4xl py-2 px-4 sm:px-6 lg:px-8 mx-auto flex space-x-3 sm:space-x-4";
  li.innerHTML = `
  <!-- Chat Bubble -->
      <!-- Replace this part with your SVG code -->

      <span class="inline-flex items-center justify-center rounded-full bg-gray-600" style="width: 40px; height: 40px;">
          <span class="text-sm font-medium text-white leading-none">LC</span>
        </span>

      <div class="grow max-w-[90%] md:max-w-2xl w-full space-y-3 flex items-center">
        <!-- Chat -->
        <div class="space-y-3">
        <p class="text-sm text-gray-800 dark:text-white">${content}</p>
        </div>
        <!-- End Chat -->
    </div>
  <!-- End Chat Bubble -->`
  chatContainer.appendChild(li);
}


function createAIMessageOnLoad(content) {
  const li = document.createElement('li');
  li.className = "max-w-4xl py-2 px-4 sm:px-6 lg:px-8 mx-auto flex space-x-3 sm:space-x-4"
  li.innerHTML = `      
  <!-- Chat Bubble -->
  <!-- Replace this part with your SVG code -->
  <img style="width: 35px; height: 35px;" src="kpl-logo.png"></img>
  <div class="grow max-w-[90%] md:max-w-2xl w-full space-y-3">
    <!-- Chat -->
    <div class="space-y-3">
      <p class="text-sm text-gray-800 dark:text-white">${content}</p>
    </div>
    <!-- End Chat -->
    <!-- Button Group -->
    <div>
      <div class="sm:flex sm:justify-between">
        <div>
          <div class="inline-flex border border-gray-200 rounded-full p-0.5 dark:border-slate-700">
            <button type="button" class="inline-flex flex-shrink-0 justify-center items-center h-8 w-8 rounded-full text-gray-500 hover:bg-blue-100 focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:hover:bg-slate-700 ">
            <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8.864.046C7.908-.193 7.02.53 6.956 1.466c-.072 1.051-.23 2.016-.428 2.59-.125.36-.479 1.013-1.04 1.639-.557.623-1.282 1.178-2.131 1.41C2.685 7.288 2 7.87 2 8.72v4.001c0 .845.682 1.464 1.448 1.545 1.07.114 1.564.415 2.068.723l.048.03c.272.165.578.348.97.484.397.136.861.217 1.466.217h3.5c.937 0 1.599-.477 1.934-1.064a1.86 1.86 0 0 0 .254-.912c0-.152-.023-.312-.077-.464.201-.263.38-.578.488-.901.11-.33.172-.762.004-1.149.069-.13.12-.269.159-.403.077-.27.113-.568.113-.857 0-.288-.036-.585-.113-.856a2.144 2.144 0 0 0-.138-.362 1.9 1.9 0 0 0 .234-1.734c-.206-.592-.682-1.1-1.2-1.272-.847-.282-1.803-.276-2.516-.211a9.84 9.84 0 0 0-.443.05 9.365 9.365 0 0 0-.062-4.509A1.38 1.38 0 0 0 9.125.111L8.864.046zM11.5 14.721H8c-.51 0-.863-.069-1.14-.164-.281-.097-.506-.228-.776-.393l-.04-.024c-.555-.339-1.198-.731-2.49-.868-.333-.036-.554-.29-.554-.55V8.72c0-.254.226-.543.62-.65 1.095-.3 1.977-.996 2.614-1.708.635-.71 1.064-1.475 1.238-1.978.243-.7.407-1.768.482-2.85.025-.362.36-.594.667-.518l.262.066c.16.04.258.143.288.255a8.34 8.34 0 0 1-.145 4.725.5.5 0 0 0 .595.644l.003-.001.014-.003.058-.014a8.908 8.908 0 0 1 1.036-.157c.663-.06 1.457-.054 2.11.164.175.058.45.3.57.65.107.308.087.67-.266 1.022l-.353.353.353.354c.043.043.105.141.154.315.048.167.075.37.075.581 0 .212-.027.414-.075.582-.05.174-.111.272-.154.315l-.353.353.353.354c.047.047.109.177.005.488a2.224 2.224 0 0 1-.505.805l-.353.353.353.354c.006.005.041.05.041.17a.866.866 0 0 1-.121.416c-.165.288-.503.56-1.066.56z"/>
          </svg>
            </button>
            <button type="button" class="inline-flex flex-shrink-0 justify-center items-center h-8 w-8 rounded-full text-gray-500 hover:bg-blue-100 focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:hover:bg-slate-700">
              <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8.864 15.674c-.956.24-1.843-.484-1.908-1.42-.072-1.05-.23-2.015-.428-2.59-.125-.36-.479-1.012-1.04-1.638-.557-.624-1.282-1.179-2.131-1.41C2.685 8.432 2 7.85 2 7V3c0-.845.682-1.464 1.448-1.546 1.07-.113 1.564-.415 2.068-.723l.048-.029c.272-.166.578-.349.97-.484C6.931.08 7.395 0 8 0h3.5c.937 0 1.599.478 1.934 1.064.164.287.254.607.254.913 0 .152-.023.312-.077.464.201.262.38.577.488.9.11.33.172.762.004 1.15.069.13.12.268.159.403.077.27.113.567.113.856 0 .289-.036.586-.113.856-.035.12-.08.244-.138.363.394.571.418 1.2.234 1.733-.206.592-.682 1.1-1.2 1.272-.847.283-1.803.276-2.516.211a9.877 9.877 0 0 1-.443-.05 9.364 9.364 0 0 1-.062 4.51c-.138.508-.55.848-1.012.964l-.261.065zM11.5 1H8c-.51 0-.863.068-1.14.163-.281.097-.506.229-.776.393l-.04.025c-.555.338-1.198.73-2.49.868-.333.035-.554.29-.554.55V7c0 .255.226.543.62.65 1.095.3 1.977.997 2.614 1.709.635.71 1.064 1.475 1.238 1.977.243.7.407 1.768.482 2.85.025.362.36.595.667.518l.262-.065c.16-.04.258-.144.288-.255a8.34 8.34 0 0 0-.145-4.726.5.5 0 1 1 .595-.643h.003l.014.004.058.013a8.912 8.912 0 0 0 1.036.157c.663.06 1.457.054 2.11-.163.175-.059.45-.301.57-.651.107-.308.087-.67-.266-1.021L12.793 7l.353-.354c.043-.042.105-.14.154-.315.048-.167.075-.37.075-.581 0-.211-.027-.414-.075-.581-.05-.174-.111-.273-.154-.315l-.353-.354.353-.354c.047-.047.109-.176.005-.488a2.224 2.224 0 0 0-.505-.804l-.353-.354.353-.354c.006-.005.041-.05.041-.17a.866.866 0 0 0-.121-.415C12.4 1.272 12.063 1 11.5 1z"/>
              </svg>
            </button>
          </div>
          <button type="button" onclick="copyTextToClipboard(this)" copy-button class="py-2 px-3 inline-flex justify-center items-center gap-x-2 rounded-full border border-transparent text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all text-sm dark:hover:bg-slate-800 dark:hover:text-gray-400 dark:hover:border-gray-900 dark:focus:ring-gray-900 dark:focus:ring-offset-gray-800" data-clipboard-text="${content}">
            <svg class="h-3.5 w-3.5 mr-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
            Copy
          </button>
          <button type="button" class="py-2 px-3 inline-flex justify-center items-center gap-x-2 rounded-full border border-transparent text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all text-sm dark:hover:bg-slate-800 dark:hover:text-gray-400 dark:hover:border-gray-900 dark:focus:ring-gray-900 dark:focus:ring-offset-gray-800">
            <svg class="h-3.5 w-3.5 mr-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
            </svg>
            Share
          </button>
        </div>
      </div>
    </div>
  </div>
  <!-- End Button Group -->
</div>
<!-- End Chat Bubble -->
  `;
  chatContainer.appendChild(li);
}

function createUserFileElement(fileName) {
  const li = document.createElement('li');
  li.className = "py-2 sm:py-4"
  li.innerHTML = `      
  <!-- Chat Bubble -->
  <li class="py-2 sm:py-4">
    <div class="max-w-4xl px-4 sm:px-6 lg:px-8 mx-auto">
      <div class="max-w-2xl flex gap-x-2 sm:gap-x-4">
        <span class="flex-shrink-0 inline-flex items-center justify-center h-[2.375rem] w-[2.375rem] rounded-full bg-gray-600">
          <span class="text-sm font-medium text-white leading-none">LC</span>
        </span>
        <div class="grow mt-2 space-y-3">
          <p class="text-gray-800 dark:text-gray-200">
            File uploaded
          </p>
          <ul class="flex flex-col justify-end text-start -space-y-px">
            <li class="flex items-center gap-x-2 p-3 text-sm bg-white border text-gray-800 first:rounded-t-lg first:mt-0 last:rounded-b-lg dark:bg-slate-900 dark:border-gray-700 dark:text-gray-200">
              <div class="w-full flex justify-between truncate">
                <span class="mr-3 flex-1 w-0 truncate">
                  ${fileName}
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </li>
  <!-- End Chat Bubble -->
  `;
  chatContainer.appendChild(li);
}

function createAIChatElement(content) {
  const li = document.createElement('li');
  li.className = "max-w-4xl py-2 px-4 sm:px-6 lg:px-8 mx-auto flex space-x-3 sm:space-x-4"
  li.innerHTML = content;
  chatContainer.appendChild(li);
}

function showChat() {
  const sections = document.querySelectorAll('section');
  sections.forEach(element => {
      element.classList.add('hidden');
  });
  document.getElementById('chat').classList.remove('hidden');
}

function showDashboard()  {
  console.log('Showing dashboard');
  const sections = document.querySelectorAll('section');
  sections.forEach(element => {
      element.classList.add('hidden');
  });
  document.getElementById('dashboard').classList.remove('hidden');
  showToastifyWIP();
}

function showNewChat()  {
  console.log('Showing new chat page');
  newChatInput.value = '';
  sidebar.classList.remove('hidden', '-translate-x-full');
  sidebar.classList.add('lg:translate-x-0');
  const sections = document.querySelectorAll('section');
  sections.forEach(element => {
      element.classList.add('hidden');
  });
  document.getElementById('newchat').classList.remove('hidden');
}

function showSignIn() {
  console.log('Showing sign-in page');
  const sections = document.querySelectorAll('section');
  sections.forEach(element => {
      element.classList.add('hidden');
  });
  document.getElementById('signin').classList.remove('hidden');
  sidebar.classList.add('hidden');
  // If the sidebar is hidden, remove the translation class to slide it out
  if (sidebar.classList.contains('hidden')) {
    sidebar.classList.remove('lg:translate-x-0');
    sidebar.classList.add('-translate-x-full');
  } else {
    // If the sidebar is shown, add the translation class to slide it in
    sidebar.classList.remove('-translate-x-full');
    sidebar.classList.add('lg:translate-x-0');
  }
}

async function fetchChatsAndPopulateSidebar() {
  try {
    // Fetch the chat history from the /chats route
    const response = await fetch('/chats');
    const chatHistory = await response.json();

    // Get the sidebar list element
    const sidebarList = document.getElementById('chats');

    // Convert the chat history object into an array of chats
    const chats = Object.entries(chatHistory).map(([chatId, messages]) => ({ chatId, messages }));

    // Loop through each chat in reverse order and create a new <li> element
    for (let i = chats.length - 1; i >= 0; i--) {
      const { chatId, messages } = chats[i];
      
      // Get the title from the first message of the chat
      const title = messages[0].title || `Chat ${chatId}`;

      const li = document.createElement('li');
      li.innerHTML = `
        <a data-chatid="${chatId} id="${chatId}" class="flex items-center gap-x-3 py-2 px-3 text-sm text-slate-700 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-300 transition-all duration-300" href="javascript:;">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"></path>
          </svg>
          ${title}
        </a>
      `;
      li.addEventListener('click', () => {
        currentChatId = chatId;
        fetchAndRenderConversation(chatId);
        console.log('function called with chatid of ', chatId);
      });
      sidebarList.appendChild(li);
    }
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  fetchChatsAndPopulateSidebar();

  fetch('/user')
    .then(response => {
      if (response.status === 200) {
        userSignedIn = true;
        return response.json();
      } else {
        showSignIn();
        console.error(`You're not logged in.`);
        return null; // Return null to stop further processing
      }
    })
    .then(data => {
      if (data === null) {
        return; // Exit the function if data is null
      }
      
      userName = data.name;
      userId = data.userId;
      greetingText.textContent = `Hello, ${userName}`;
      
      setTimeout(() => {
        // Add the 'spin' class to both icons to trigger the spin animation
        signInIcon.classList.add("spin");
        signOutIcon.classList.add("spin");

        // Set a timeout to remove the 'spin' class after the animation is complete
        setTimeout(() => {
          signInIcon.classList.remove("spin");
          signInIcon.classList.add("hidden");
          signOutIcon.classList.remove("spin");
          signOutIcon.classList.remove("hidden");
          signInButton.querySelector('span').textContent = "Sign out";
        }, 300); // Adjust the duration based on your animation duration
      }, 700);
    })
    .catch(error => {
      userSignedIn = false;
      console.error('User not logged in');
    });
});

async function fetchAndRenderConversation(chatId) {
  try {
    const response = await fetch(`/conversation/${chatId}`);
    const conversation = await response.json();
    showChat();
    chatContainer.innerHTML = '';

    conversation.forEach(message => {
      if (message.role === 'user') {
        createUserChatElement(message.content);
      } else if (message.role === 'chatbot') {
        createAIMessageOnLoad(message.content);
      }
      // Add more conditions for other roles if needed
    });
  } catch (error) {
    console.error(error);
    // Handle error
  }
}

  // Function to scroll the chat container to the bottom
  function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

function showToastifyError(message)  {
  Toastify({
    text: message,
    duration: 2000, // Display duration in milliseconds
    newWindow: true, // Open the toast in a new window/tab
    gravity: "top", // Position of the toast (top, bottom, left, right)
    position: "center", // Toast position within the gravity (center, left, right)
    backgroundColor: "red", // Light green background color
    stopOnFocus: true, // Stop the toast from disappearing on focus
    className: "custom-toast", // Add a custom CSS class for additional styling
    // Additional options can be added here
  }).showToast(); 
}

function showToastifyWIP()  {
  Toastify({
    text: 'This feature is a work in progress.',
    duration: 2000, // Display duration in milliseconds
    newWindow: true, // Open the toast in a new window/tab
    gravity: "bottom", // Position of the toast (top, bottom, left, right)
    position: "center", // Toast position within the gravity (center, left, right)
    backgroundColor: "#DAA520", // Light green background color
    stopOnFocus: true, // Stop the toast from disappearing on focus
    className: "custom-toast", // Add a custom CSS class for additional styling
    // Additional options can be added here
  }).showToast();
}






