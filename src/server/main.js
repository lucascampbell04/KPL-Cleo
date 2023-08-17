require('dotenv').config(); 
const express = require("express");
const ViteExpress = require("vite-express");
const { Configuration, OpenAIApi } = require('openai');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const multer = require('multer');
const textract = require('textract');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const MongoDBStore = require('connect-mongodb-session')(session);
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);
const mongoURL = process.env.MONGOURL;
const dbName = 'Cluster0';
const app = express();

// Mongoose setup
mongoose.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true });
const userSchema = new mongoose.Schema({
  _id: ObjectId,
  name: String,
  email: String,
  password: String,
  chatHistory: Object,
});
const User = mongoose.model('User', userSchema);

// Configure MongoDBStore
const store = new MongoDBStore({
  uri: mongoURL,
  databaseName: dbName,
  collection: 'sessions', // Change to a suitable collection name
});

store.on('error', function (error) {
  console.log(error);
});
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: store, // Use MongoDBStore as the session store
    cookie: {
      secure: false, // Change to true if using HTTPS
      domain: 'localhost', // Replace with your actual domain
    },
  })
);

app.use(express.json({limit: '50mb'}));
app.use(cors({
  origin: 'http://localhost:3000', // Replace with your Vite app's actual URL
  credentials: true, // This allows cookies to be sent with the request
}));

// Process chat-like conversation with GPT-3.5-turbo
app.post('/chat', requireAuth, async (req, res) => {
  console.log('Chatting with GPT-3.5-turbo');

  try {
    let userMessage = req.body.message;
    const messageType = req.body.messageType;
    const fromFile = req.body.fromFile;
    const fileName = req.body.fileName;

    const userId = req.session.user._id; // Assuming you have access to the user object
    const existingUser = await User.findOne({ _id: userId });
    console.log('User chatting: ', existingUser);
    let chatId = req.body.chatId;

    // Convert chatId to string if it's a number
    if (typeof chatId === 'number') {
      chatId = chatId.toString();
    }

    // Check if chatId is provided in the request body
    if (!chatId) {
      console.log('chatid not given ');
      // Generate a unique ID for the new chat and initialize an empty chat history
      const newChatId = new Date().getTime().toString();
      const newChatHistory = [];
      console.log(existingUser);
      existingUser.chatHistory[newChatId] = [];


      if (fromFile === true)  {
        userMessage = `User uploaded a file titled ${fileName}. Here is the text inside of it: ///  START FILE ///` + userMessage + `/// END FILE ///`;
        newChatHistory.push({
          title: `File: ${fileName.length > 14 ? fileName.substring(0, 14) + '...' : fileName}`
        })
      } else {
        newChatHistory.push({
          title: `${userMessage.length > 14 ? userMessage.substring(0, 14) + '...' : userMessage}`
        })
      }

      // Add the user message to the chat history
      newChatHistory.push({
        role: 'user',
        content: userMessage,
      });

      // Serialize the chatHistory array into a JSON string
      const chatHistoryJSON = JSON.stringify(newChatHistory);
      let conversation = [];
      if (fromFile) {
         conversation = [
          {
            role: 'system',
            content: `You are Cleo, an AI chatbot created strictly for employee use at the Kalamazoo Public Library. You were made to analyze large sets of data and provide conversational analytics. You provide an easy way to interpret data by discussing it in plain english with the user. You are helpful and friendly. Here is a file of data to start with. Please thoroughly analyze the data now, in advance, so that you don't keep the user waiting in the future. For your first message, please briefly greet the user and then provide a very brief summary of the file uploaded and then offer to assist with any questions about the data: ${chatHistoryJSON}`,
          },
        ];
      } else {
      // Add the system message and the user message to the conversation
       conversation = [
        {
          role: 'system',
          content: `You are Cleo, an AI chatbot created strictly for employee use at the Kalamazoo Public Library. You were made to analyze large sets of data and provide conversational analytics. You provide an easy way to interpret data by discussing it in plain english with the user. You are helpful and friendly. Please thoroughly analyze the data now, in advance, so that you don't keep the user waiting in the future. Here is the chat history: ${chatHistoryJSON}`,
        },
      ];
    }
      // Make the API call
      const response = await openai.createChatCompletion(
        {
          model: 'gpt-3.5-turbo',
          messages: conversation,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      );

      console.log(response.data.choices); // Log the response to the console

      // Extract the model's reply from the API response
      const modelReply = response.data.choices[0].message.content.trim();

      // Add the model's reply to the chat history
      newChatHistory.push({
        role: 'chatbot',
        content: modelReply,
      });

      // Update the chat history in the database
      existingUser.chatHistory[newChatId] = newChatHistory;
      existingUser.markModified('chatHistory'); // Mark the chatHistory field as modified
      existingUser.save();
      // Send the reply back to the client
      // Check if the messageType is 'text'


    const chatBubbleHTML = `
    <!-- Chat Bubble -->
    <!-- Replace this part with your SVG code -->
    <img style="width: 35px; height: 35px;" src="kpl-logo.png"></img>
    <div class="grow max-w-[90%] md:max-w-2xl w-full space-y-3">
      <!-- Chat -->
      <div class="space-y-3">
        <p class="text-sm text-gray-800 dark:text-white">${modelReply}</p>
      </div>
      <!-- End Chat -->
      <!-- Button Group -->
      <div>
        <div class="sm:flex sm:justify-between">
          <div>
            <div class="inline-flex border border-gray-200 rounded-full p-0.5 dark:border-slate-700">
              <button type="button" class="inline-flex flex-shrink-0 justify-center items-center h-8 w-8 rounded-full text-gray-500 hover:bg-blue-100 hover:text-blue-800 focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:hover:bg-blue-900 dark:hover:text-blue-200">
              <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8.864.046C7.908-.193 7.02.53 6.956 1.466c-.072 1.051-.23 2.016-.428 2.59-.125.36-.479 1.013-1.04 1.639-.557.623-1.282 1.178-2.131 1.41C2.685 7.288 2 7.87 2 8.72v4.001c0 .845.682 1.464 1.448 1.545 1.07.114 1.564.415 2.068.723l.048.03c.272.165.578.348.97.484.397.136.861.217 1.466.217h3.5c.937 0 1.599-.477 1.934-1.064a1.86 1.86 0 0 0 .254-.912c0-.152-.023-.312-.077-.464.201-.263.38-.578.488-.901.11-.33.172-.762.004-1.149.069-.13.12-.269.159-.403.077-.27.113-.568.113-.857 0-.288-.036-.585-.113-.856a2.144 2.144 0 0 0-.138-.362 1.9 1.9 0 0 0 .234-1.734c-.206-.592-.682-1.1-1.2-1.272-.847-.282-1.803-.276-2.516-.211a9.84 9.84 0 0 0-.443.05 9.365 9.365 0 0 0-.062-4.509A1.38 1.38 0 0 0 9.125.111L8.864.046zM11.5 14.721H8c-.51 0-.863-.069-1.14-.164-.281-.097-.506-.228-.776-.393l-.04-.024c-.555-.339-1.198-.731-2.49-.868-.333-.036-.554-.29-.554-.55V8.72c0-.254.226-.543.62-.65 1.095-.3 1.977-.996 2.614-1.708.635-.71 1.064-1.475 1.238-1.978.243-.7.407-1.768.482-2.85.025-.362.36-.594.667-.518l.262.066c.16.04.258.143.288.255a8.34 8.34 0 0 1-.145 4.725.5.5 0 0 0 .595.644l.003-.001.014-.003.058-.014a8.908 8.908 0 0 1 1.036-.157c.663-.06 1.457-.054 2.11.164.175.058.45.3.57.65.107.308.087.67-.266 1.022l-.353.353.353.354c.043.043.105.141.154.315.048.167.075.37.075.581 0 .212-.027.414-.075.582-.05.174-.111.272-.154.315l-.353.353.353.354c.047.047.109.177.005.488a2.224 2.224 0 0 1-.505.805l-.353.353.353.354c.006.005.041.05.041.17a.866.866 0 0 1-.121.416c-.165.288-.503.56-1.066.56z"/>
            </svg>
              </button>
              <button type="button" class="inline-flex flex-shrink-0 justify-center items-center h-8 w-8 rounded-full text-gray-500 hover:bg-blue-100 hover:text-blue-800 focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:hover:bg-blue-900 dark:hover:text-blue-200">
                <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8.864 15.674c-.956.24-1.843-.484-1.908-1.42-.072-1.05-.23-2.015-.428-2.59-.125-.36-.479-1.012-1.04-1.638-.557-.624-1.282-1.179-2.131-1.41C2.685 8.432 2 7.85 2 7V3c0-.845.682-1.464 1.448-1.546 1.07-.113 1.564-.415 2.068-.723l.048-.029c.272-.166.578-.349.97-.484C6.931.08 7.395 0 8 0h3.5c.937 0 1.599.478 1.934 1.064.164.287.254.607.254.913 0 .152-.023.312-.077.464.201.262.38.577.488.9.11.33.172.762.004 1.15.069.13.12.268.159.403.077.27.113.567.113.856 0 .289-.036.586-.113.856-.035.12-.08.244-.138.363.394.571.418 1.2.234 1.733-.206.592-.682 1.1-1.2 1.272-.847.283-1.803.276-2.516.211a9.877 9.877 0 0 1-.443-.05 9.364 9.364 0 0 1-.062 4.51c-.138.508-.55.848-1.012.964l-.261.065zM11.5 1H8c-.51 0-.863.068-1.14.163-.281.097-.506.229-.776.393l-.04.025c-.555.338-1.198.73-2.49.868-.333.035-.554.29-.554.55V7c0 .255.226.543.62.65 1.095.3 1.977.997 2.614 1.709.635.71 1.064 1.475 1.238 1.977.243.7.407 1.768.482 2.85.025.362.36.595.667.518l.262-.065c.16-.04.258-.144.288-.255a8.34 8.34 0 0 0-.145-4.726.5.5 0 1 1 .595-.643h.003l.014.004.058.013a8.912 8.912 0 0 0 1.036.157c.663.06 1.457.054 2.11-.163.175-.059.45-.301.57-.651.107-.308.087-.67-.266-1.021L12.793 7l.353-.354c.043-.042.105-.14.154-.315.048-.167.075-.37.075-.581 0-.211-.027-.414-.075-.581-.05-.174-.111-.273-.154-.315l-.353-.354.353-.354c.047-.047.109-.176.005-.488a2.224 2.224 0 0 0-.505-.804l-.353-.354.353-.354c.006-.005.041-.05.041-.17a.866.866 0 0 0-.121-.415C12.4 1.272 12.063 1 11.5 1z"/>
                </svg>
              </button>
            </div>
            <button type="button" class="py-2 px-3 inline-flex justify-center items-center gap-x-2 rounded-full border border-transparent text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all text-sm dark:hover:bg-slate-800 dark:hover:text-gray-400 dark:hover:border-gray-900 dark:focus:ring-gray-900 dark:focus:ring-offset-gray-800">
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

      if (messageType === 'text') {
        res.status(200).send({ chatId: newChatId, reply: chatBubbleHTML });
        return;
      } 
      res.status(200).json({ chatId: newChatId, reply: modelReply });
    } else {
      console.log('chatid given');
      // Find the chat in the database using the provided chatId
      const existingChat = existingUser.chatHistory[chatId];

      console.log(chatId);
      if (existingChat) {
        console.log('chatid match');
        // Load the chat history
        const chatHistory = existingUser.chatHistory[chatId];

        if (fromFile === true)  {
          userMessage = `User uploaded a file titled ${fileName}. Here is the text inside of it: ///  START FILE ///` + userMessage + `/// END FILE ///`;
        }

        // Add the user message to the chat history
        chatHistory.push({
          role: 'user',
          content: userMessage,
        });

        // Serialize the chatHistory array into a JSON string
        const chatHistoryJSON = JSON.stringify(chatHistory);

        // Add the system message and the user message to the conversation
        const conversation = [
          {
            role: 'system',
            content: `You are Cleo, a concise and straight-forward AI chatbot created strictly for employee use at the Kalamazoo Public Library. You were made to analyze large sets of data and provide conversational analytics. You provide an easy way to interpret data by discussing it in plain english with the user. Please thoroughly analyze the data now, in advance, so that you don't keep the user waiting in the future. You are helpful and friendly. Here is the chat history: ${chatHistoryJSON}`,
          },
        ];

        // Make the API call
        const response = await openai.createChatCompletion(
          {
            model: 'gpt-3.5-turbo',
            messages: conversation,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
          }
        );

        console.log(response.data.choices); // Log the response to the console

        // Extract the model's reply from the API response
        const modelReply = response.data.choices[0].message.content.trim();

        // Add the model's reply to the chat history
        chatHistory.push({
          role: 'chatbot',
          content: modelReply,
        });

        // Update the chat history in the database
        existingUser.chatHistory[chatId] = chatHistory;
        existingUser.markModified('chatHistory'); // Mark the chatHistory field as modified
        existingUser.save();

        console.log(chatHistory);


    const chatBubbleHTML = `
    <!-- Chat Bubble -->
    <!-- Replace this part with your SVG code -->
    <img style="width: 35px; height: 35px;" src="kpl-logo.png"></img>
    <div class="grow max-w-[90%] md:max-w-2xl w-full space-y-3">
      <!-- Chat -->
      <div class="space-y-3">
        <p class="text-sm text-gray-800 dark:text-white">${modelReply}</p>
      </div>
      <!-- End Chat -->
      <!-- Button Group -->
      <div>
        <div class="sm:flex sm:justify-between">
          <div>
            <div class="inline-flex border border-gray-200 rounded-full p-0.5 dark:border-slate-700">
              <button type="button" class="inline-flex flex-shrink-0 justify-center items-center h-8 w-8 rounded-full text-gray-500 hover:bg-blue-100 hover:text-blue-800 focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:hover:bg-blue-900 dark:hover:text-blue-200">
              <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8.864.046C7.908-.193 7.02.53 6.956 1.466c-.072 1.051-.23 2.016-.428 2.59-.125.36-.479 1.013-1.04 1.639-.557.623-1.282 1.178-2.131 1.41C2.685 7.288 2 7.87 2 8.72v4.001c0 .845.682 1.464 1.448 1.545 1.07.114 1.564.415 2.068.723l.048.03c.272.165.578.348.97.484.397.136.861.217 1.466.217h3.5c.937 0 1.599-.477 1.934-1.064a1.86 1.86 0 0 0 .254-.912c0-.152-.023-.312-.077-.464.201-.263.38-.578.488-.901.11-.33.172-.762.004-1.149.069-.13.12-.269.159-.403.077-.27.113-.568.113-.857 0-.288-.036-.585-.113-.856a2.144 2.144 0 0 0-.138-.362 1.9 1.9 0 0 0 .234-1.734c-.206-.592-.682-1.1-1.2-1.272-.847-.282-1.803-.276-2.516-.211a9.84 9.84 0 0 0-.443.05 9.365 9.365 0 0 0-.062-4.509A1.38 1.38 0 0 0 9.125.111L8.864.046zM11.5 14.721H8c-.51 0-.863-.069-1.14-.164-.281-.097-.506-.228-.776-.393l-.04-.024c-.555-.339-1.198-.731-2.49-.868-.333-.036-.554-.29-.554-.55V8.72c0-.254.226-.543.62-.65 1.095-.3 1.977-.996 2.614-1.708.635-.71 1.064-1.475 1.238-1.978.243-.7.407-1.768.482-2.85.025-.362.36-.594.667-.518l.262.066c.16.04.258.143.288.255a8.34 8.34 0 0 1-.145 4.725.5.5 0 0 0 .595.644l.003-.001.014-.003.058-.014a8.908 8.908 0 0 1 1.036-.157c.663-.06 1.457-.054 2.11.164.175.058.45.3.57.65.107.308.087.67-.266 1.022l-.353.353.353.354c.043.043.105.141.154.315.048.167.075.37.075.581 0 .212-.027.414-.075.582-.05.174-.111.272-.154.315l-.353.353.353.354c.047.047.109.177.005.488a2.224 2.224 0 0 1-.505.805l-.353.353.353.354c.006.005.041.05.041.17a.866.866 0 0 1-.121.416c-.165.288-.503.56-1.066.56z"/>
            </svg>
              </button>
              <button type="button" class="inline-flex flex-shrink-0 justify-center items-center h-8 w-8 rounded-full text-gray-500 hover:bg-blue-100 hover:text-blue-800 focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:hover:bg-blue-900 dark:hover:text-blue-200">
                <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8.864 15.674c-.956.24-1.843-.484-1.908-1.42-.072-1.05-.23-2.015-.428-2.59-.125-.36-.479-1.012-1.04-1.638-.557-.624-1.282-1.179-2.131-1.41C2.685 8.432 2 7.85 2 7V3c0-.845.682-1.464 1.448-1.546 1.07-.113 1.564-.415 2.068-.723l.048-.029c.272-.166.578-.349.97-.484C6.931.08 7.395 0 8 0h3.5c.937 0 1.599.478 1.934 1.064.164.287.254.607.254.913 0 .152-.023.312-.077.464.201.262.38.577.488.9.11.33.172.762.004 1.15.069.13.12.268.159.403.077.27.113.567.113.856 0 .289-.036.586-.113.856-.035.12-.08.244-.138.363.394.571.418 1.2.234 1.733-.206.592-.682 1.1-1.2 1.272-.847.283-1.803.276-2.516.211a9.877 9.877 0 0 1-.443-.05 9.364 9.364 0 0 1-.062 4.51c-.138.508-.55.848-1.012.964l-.261.065zM11.5 1H8c-.51 0-.863.068-1.14.163-.281.097-.506.229-.776.393l-.04.025c-.555.338-1.198.73-2.49.868-.333.035-.554.29-.554.55V7c0 .255.226.543.62.65 1.095.3 1.977.997 2.614 1.709.635.71 1.064 1.475 1.238 1.977.243.7.407 1.768.482 2.85.025.362.36.595.667.518l.262-.065c.16-.04.258-.144.288-.255a8.34 8.34 0 0 0-.145-4.726.5.5 0 1 1 .595-.643h.003l.014.004.058.013a8.912 8.912 0 0 0 1.036.157c.663.06 1.457.054 2.11-.163.175-.059.45-.301.57-.651.107-.308.087-.67-.266-1.021L12.793 7l.353-.354c.043-.042.105-.14.154-.315.048-.167.075-.37.075-.581 0-.211-.027-.414-.075-.581-.05-.174-.111-.273-.154-.315l-.353-.354.353-.354c.047-.047.109-.176.005-.488a2.224 2.224 0 0 0-.505-.804l-.353-.354.353-.354c.006-.005.041-.05.041-.17a.866.866 0 0 0-.121-.415C12.4 1.272 12.063 1 11.5 1z"/>
                </svg>
              </button>
            </div>
            <button type="button" class="py-2 px-3 inline-flex justify-center items-center gap-x-2 rounded-full border border-transparent text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all text-sm dark:hover:bg-slate-800 dark:hover:text-gray-400 dark:hover:border-gray-900 dark:focus:ring-gray-900 dark:focus:ring-offset-gray-800">
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
  
          // Check if the messageType is 'text'
          if (messageType === 'text') {
            res.status(200).send({ chatId: chatId, reply: chatBubbleHTML });
            return;
          }
        res.status(200).json({ chatId, reply: modelReply });
      } else {
        res.status(404).json({ message: 'Chat not found.' });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

// Define a route to get all chats from a user's chatHistory
app.get('/chats', requireAuth, async (req, res) => {
  if (!req.session.user) {
    res.status(401).send({message: "Not logged in"});
    return;
  }
  const userId = req.session.user._id;

  try {
    // Find the user by their userId
    const existingUser = await User.findOne({ _id: userId });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Retrieve the chatHistory from the user object
    const chatHistory = existingUser.chatHistory;

    // Return the chat history
    res.json(chatHistory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Define a route to get a specific chat by its ID
app.get('/conversation/:chatId', requireAuth, async (req, res) => {
  if (!req.session.user) {
    res.status(401).send({ message: "Not logged in" });
    return;
  }
  const userId = req.session.user._id;
  const chatId = req.params.chatId; // Get the chat ID from the URL parameter

  try {
    // Find the user by their userId
    const existingUser = await User.findOne({ _id: userId });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Retrieve the chatHistory from the user object
    const chatHistory = existingUser.chatHistory;

    // Find the specific chat based on the chat ID
    const specificChat = chatHistory[chatId];

    if (!specificChat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Return the specific chat
    res.json(specificChat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

const upload = multer({ dest: 'uploads/' });

app.post('/convert', requireAuth, upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file received' });
  }

  try {
    const buffer = fs.readFileSync(file.path);
    textract.fromBufferWithMime(file.mimetype, buffer, (err, text) => {
      if (err) {
        console.error('Error converting file:', err);
        return res.status(500).json({ error: 'Error converting file' });
      }
      // Sending plainText back to the client
      res.send(text);
      // Removing the uploaded file after conversion
      fs.unlinkSync(file.path);
    });
  } catch (err) {
    console.error('Error processing file:', err);
    return res.status(500).json({ error: 'Error processing file' });
  }
});
app.post('/signin', async (req, res) => {
  const client = new MongoClient(mongoURL);
  const { email, password, rememberMe } = req.body;

  try {
    await client.connect();

    const database = client.db(dbName);
    const usersCollection = database.collection('users');

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    req.session.user = user;

    if (user._id) {
      const userId = user._id.toString(); // Convert MongoDB ObjectId to string

      const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined; // 30 days or session-based

      res.cookie('userid', userId, {
        maxAge: maxAge,
        httpOnly: true,
        secure: false,
        expires: maxAge ? new Date(Date.now() + maxAge) : undefined
      });
    }

    res.status(200).json({ name: user.name, message: 'Signed in successfully' });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred' });
  } finally {
    client.close(); // Close the MongoClient connection
  }
});

app.post('/signout', (req, res) => {
  // Clear the session data
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ message: 'An error occurred' });
    }

    // Clear the user cookie
    res.clearCookie('userid');

    return res.status(200).json({ message: 'Signed out successfully' });
  });
});


// Define the '/user' route
app.get('/user', (req, res) => {
  // Check if the user is logged in (authenticated)
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Get user's information from session
  const { name, _id } = req.session.user;

  // Return the user's name and id
  res.json({ name, userId: _id });
});

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'User not signed in'});
  }
  next();
}

async function createUser() {
  const client = new MongoClient(mongoURL);

  try {
    await client.connect();

    const database = client.db(dbName); // Replace with your database name
    const usersCollection = database.collection('users');

    const name = 'first name here';
    const email = 'kpl.gov email here';
    const password = 'password here';

    // Hash the password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate a random user id (you can use ObjectId() from the 'mongodb' library)
    const userId = new ObjectId();

    const user = {
      _id: userId,
      name: name,
      email: email,
      password: hashedPassword,
    };

    // Insert the user document into the users collection
    const result = await usersCollection.insertOne(user);
    console.log('User created:', result.insertedId);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.close();
  }
}

app.use(async (req, res, next) => {
  console.log('checking for cookie');

  if (req.cookies.userid && !req.session.user) {
    console.log('cookie found');
    const userId = req.cookies.userid;

    // Connect to MongoDB
    const client = new MongoClient(mongoURL);
    await client.connect();

    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    // Find the user with the matching userId
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    console.log('user:', user);

    if (user) {
      console.log('session', req.session);

      // Convert the ObjectId to a string before storing
      user._id = user._id.toString();

      req.session.user = user;
    }

    client.close();
  }

  next(); // Move to the next middleware or route handler
});

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000...")
);
