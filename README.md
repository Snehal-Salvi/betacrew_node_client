# 📦 TCP Packet Client

This project is a Node.js application that connects to a TCP server, requests packets, handles missing sequences, and generates a JSON file with the received data.

## 🛠️ Installation

To run this project locally, follow these steps:

1. Clone the github repository.
   https://github.com/Snehal-Salvi/betacrew_node_client

2. Navigate to the project directory.
3. Make sure you have Node.js installed.
4. Run the server file.

```
node main.js
```

5. The TCP server will start running on http://localhost:3000.

6. Run the client file.

```
node client.js
```

7. `output.json` file will generate with the collected data.

### Expected Behavior

- The client connects to the TCP server at `localhost` on port `3000`.
- It sends a request to stream all packets from the server.
- It parses incoming packets and identifies any missing sequences.
- If there are missing sequences, it requests those missing packets.
- Once all packets are received, it generates an `output.json` file with the collected data.

## 💡 Approach

### Overview

This client application performs the following tasks:

#### Connect to the Server

- Establish a TCP connection to the server using `net.Socket`.

#### Request All Packets

- Send a request to the server to stream all packets using the `STREAM_ALL_PACKETS` call type.

#### Handle Incoming Data

- Accumulate incoming data in a buffer.
- Parse the buffer to extract individual packets.
- Store parsed packets in an array.

#### Handle Missing Sequences

- After the connection is closed, check for any missing packet sequences.
- If missing sequences are found, send requests to the server to resend those packets.

#### Generate JSON File

- After receiving all packets (including any resent packets), sort the packets by their sequence numbers.
- Write the sorted packets to an `output.json` file.

### Detailed Functions

#### sendStreamAllPacketsRequest

- Sends a request to the server to stream all packets.

#### parsePackets

- Parses the response buffer to extract packets and stores them in the packets array.

#### handleMissingSequences

- Identifies missing sequences and requests them from the server.

#### findMissingSequences

- Finds and returns a list of missing packet sequences.

#### requestMissingPackets

- Requests missing packets from the server and appends them to the packets array.

#### generateJSONFile

- Sorts the packets by sequence number and writes them to an `output.json` file.

### ⚠️ Error Handling

- **Connection Errors**: Logs any connection errors to the console.

## 👩‍💻 Authors

- [@Snehal](https://github.com/Snehal-Salvi)
