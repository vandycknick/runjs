import {
  createNetlink,
  createRtNetlink,
  ifla,
  Protocol,
  RawNetlinkSocket,
  rt,
} from "npm:netlink@0.3.0";

console.log("from my code");
// const socket = new RawNetlinkSocket(Protocol.ROUTE)
// const socket1 = createNetlink(Protocol.ROUTE)
console.log("did this work");

const socket = createRtNetlink();

console.log(socket);

// List addresses
const addrs = await socket.getAddresses();
console.log("Addresses:", addrs);
