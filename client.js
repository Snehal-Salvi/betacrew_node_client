const net = require("net"); // Import the net module to create a TCP connection
const fs = require("fs"); // Import the fs module to interact with the file system

// Constants defining the server port, host, packet size, and call types
const SERVER_PORT = 3000;
const SERVER_HOST = "localhost";
const PACKET_SIZE = 17; // Each packet is 17 bytes
const STREAM_ALL_PACKETS = 1; // Call type for requesting all packets
const RESEND_PACKET = 2; // Call type for requesting a specific packet to be resent

// Create a new TCP socket client
const client = new net.Socket();

// An array to store received packets
const packets = [];

// A flag to indicate if the connection has been closed
let isConnectionClosed = false;

// A buffer to store incoming data
let responseBuffer = Buffer.alloc(0);

// Connect to the server
client.connect(SERVER_PORT, SERVER_HOST, () => {
  console.log("Connected to the server");
  // Once connected, send a request to stream all packets
  sendStreamAllPacketsRequest();
});

// Handle incoming data from the server
client.on("data", (data) => {
  // If the connection is closed, ignore any incoming data
  if (isConnectionClosed) return;
  // Concatenate the new data to the response buffer
  responseBuffer = Buffer.concat([responseBuffer, data]);
  // Parse the packets from the buffer
  parsePackets();
});

// Handle the end of the connection
client.on("end", () => {
  console.log("Server closed the connection");
  // Set the connection closed flag to true
  isConnectionClosed = true;
  // Check for missing packet sequences and handle them
  handleMissingSequences();
});

// Handle connection errors
client.on("error", (err) => {
  console.error("Error occurred:", err);
  // Add error handling logic here, such as attempting to reconnect
});

// Function to send a "Stream All Packets" request to the server
function sendStreamAllPacketsRequest() {
  // Ensure the connection is established before sending the request
  if (client.readyState === "open") {
    // Create a buffer for the payload
    const payload = Buffer.alloc(2);
    // Set the call type to STREAM_ALL_PACKETS
    payload.writeUInt8(STREAM_ALL_PACKETS, 0);
    // Set the resend sequence to 0 (not used in this request)
    payload.writeUInt8(0, 1);
    // Send the payload to the server
    client.write(payload);
  } else {
    console.error("Cannot send request: Connection not established.");
  }
}

// Function to parse incoming packets from the server
function parsePackets() {
  // Continue parsing packets as long as there is enough data in the buffer
  while (responseBuffer.length >= PACKET_SIZE) {
    // Extract a single packet from the buffer
    const packet = responseBuffer.slice(0, PACKET_SIZE);
    // Remove the processed packet from the buffer
    responseBuffer = responseBuffer.slice(PACKET_SIZE);

    // Validate the packet before processing
    if (!isValidPacket(packet)) {
      console.error("Received an invalid packet.");
      continue;
    }

    // Parse the packet fields
    const symbol = packet.slice(0, 4).toString("ascii").trim(); // Extract symbol (first 4 bytes)
    const buySellIndicator = packet.slice(4, 5).toString("ascii").trim(); // Extract buy/sell indicator (5th byte)
    const quantity = packet.readInt32BE(5); // Extract quantity (next 4 bytes as a big-endian 32-bit integer)
    const price = packet.readInt32BE(9); // Extract price (next 4 bytes as a big-endian 32-bit integer)
    const packetSequence = packet.readInt32BE(13); // Extract packet sequence (last 4 bytes as a big-endian 32-bit integer)

    // Store the parsed packet in the packets array
    packets.push({ symbol, buySellIndicator, quantity, price, packetSequence });
  }
}

// Function to validate the structure of a packet
function isValidPacket(packet) {
  // Add validation checks here, e.g., check if the packet is the correct size
  return packet.length === PACKET_SIZE;
}

// Function to handle missing packet sequences after the connection is closed
function handleMissingSequences() {
  // Extract the sequence numbers from the received packets
  const packetSequences = packets.map((packet) => packet.packetSequence);
  // Find any missing sequences
  const missingSequences = findMissingSequences(packetSequences);

  // If there are missing sequences, log them and request them from the server
  if (missingSequences.length > 0) {
    console.log("Missing sequences:", missingSequences);
    requestMissingPackets(missingSequences);
  } else {
    console.log("No missing sequences");
    // Generate the JSON file with the received packets
    generateJSONFile();
  }
}

// Function to find missing packet sequences
function findMissingSequences(sequences) {
  // An array to hold the missing sequence numbers
  const missingSequences = [];
  // Iterate through the expected sequence numbers
  for (let i = 1; i <= Math.max(...sequences); i++) {
    // If a sequence number is not in the received packets, it is missing
    if (!sequences.includes(i)) {
      missingSequences.push(i);
    }
  }
  // Return the array of missing sequence numbers
  return missingSequences;
}

// Function to request missing packets from the server
function requestMissingPackets(missingSequences) {
  // Create a new TCP socket client for requesting missing packets
  const resendClient = new net.Socket();

  // Connect to the server to request missing packets
  resendClient.connect(SERVER_PORT, SERVER_HOST, () => {
    // Iterate over each missing sequence number
    missingSequences.forEach((sequence) => {
      // Create a payload for the request
      const resendPayload = Buffer.alloc(2);
      // Set the call type to RESEND_PACKET
      resendPayload.writeUInt8(RESEND_PACKET, 0);
      // Set the resend sequence to the missing sequence number
      resendPayload.writeUInt8(sequence, 1);
      // Send the payload to the server
      resendClient.write(resendPayload);
    });
    // Close the connection after sending all requests
    resendClient.end();
  });

  // Handle incoming data for the resend client
  resendClient.on("data", (data) => {
    // Create a buffer for the resend response
    let resendResponseBuffer = Buffer.alloc(0);
    // Concatenate the new data to the resend response buffer
    resendResponseBuffer = Buffer.concat([resendResponseBuffer, data]);

    // Process the response buffer while it contains complete packets
    while (resendResponseBuffer.length >= PACKET_SIZE) {
      // Extract a single packet from the buffer
      const packet = resendResponseBuffer.slice(0, PACKET_SIZE);
      // Remove the processed packet from the buffer
      resendResponseBuffer = resendResponseBuffer.slice(PACKET_SIZE);

      // Validate the packet before processing
      if (!isValidPacket(packet)) {
        console.error("Received an invalid packet during resend.");
        continue;
      }

      // Parse the packet fields
      const symbol = packet.slice(0, 4).toString("ascii").trim(); // Extract symbol (first 4 bytes)
      const buySellIndicator = packet.slice(4, 5).toString("ascii").trim(); // Extract buy/sell indicator (5th byte)
      const quantity = packet.readInt32BE(5); // Extract quantity (next 4 bytes as a big-endian 32-bit integer)
      const price = packet.readInt32BE(9); // Extract price (next 4 bytes as a big-endian 32-bit integer)
      const packetSequence = packet.readInt32BE(13); // Extract packet sequence (last 4 bytes as a big-endian 32-bit integer)
      // Add the parsed packet to the array of packets
      packets.push({
        symbol,
        buySellIndicator,
        quantity,
        price,
        packetSequence,
      });
    }
  });

  // Event listener for the 'end' event on the resend client
  // This is triggered when the server closes the connection
  resendClient.on("end", () => {
    console.log("Resend client connection closed");
    // Generate the JSON file after receiving all missing packets
    generateJSONFile();
  });

  // Event listener for the 'error' event on the resend client
  // This is triggered if an error occurs during the connection
  resendClient.on("error", (err) => {
    console.error("Error occurred in resend client:", err);
  });
}

// Function to generate a JSON file with the collected packets
function generateJSONFile() {
  // Sort packets by their sequence numbers
  packets.sort((a, b) => a.packetSequence - b.packetSequence);
  // Convert the packets array to a JSON string with indentation
  const jsonData = JSON.stringify(packets, null, 2);

  // Write the JSON data to a file named 'output.json'
  fs.writeFile("output.json", jsonData, (err) => {
    if (err) {
      // Log the error if the file write operation fails
      console.error("Error writing JSON to file:", err);
    } else {
      // Log a success message if the file is written successfully
      console.log("JSON file generated successfully.");
    }
  });
}

// Event listener for the 'SIGINT' signal (Ctrl+C)
// This is used to gracefully close the client connection and exit the process
process.on("SIGINT", () => {
  // End the client connection
  client.end();
  // Exit the process with a status code of 0, indicating a normal exit
  process.exit(0);
});
