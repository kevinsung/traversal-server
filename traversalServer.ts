// Copyright (C) 2021 Kevin J. Sung
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { randomBytes } from "crypto";
import { createSocket } from "dgram";

interface ClientInfo {
  publicAddress: string;
  publicPort: number;
  privateAddress: string;
  privatePort: number;
}

const LISTEN_PORT = 6363;

const HOST_CODE_EXPIRATION_TIME = 1800000;

const HOSTS: Map<string, ClientInfo> = new Map();
const HOST_CODES: Map<string, string> = new Map();

function main() {
  const socket = createSocket("udp4");
  socket.bind(LISTEN_PORT);

  socket.on("message", (msg, rinfo) => {
    console.log(`Message from ${rinfo.address} port ${rinfo.port}: ${msg}`);

    const message = String(msg);

    if (message === "keepalive") {
      return;
    }

    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch {
      // ignore badly formed messages
      return;
    }

    const { privateAddress, privatePort, hostCode } = parsedMessage;
    const { address: publicAddress, port: publicPort } = rinfo;

    if (hostCode) {
      // client is requesting connection to peer
      if (HOSTS.has(hostCode)) {
        const {
          publicAddress: peerPublicAddress,
          publicPort: peerPublicPort,
          privateAddress: peerPrivateAddress,
          privatePort: peerPrivatePort,
        } = HOSTS.get(hostCode) as ClientInfo;
        const replyMessage = {
          peerPublicAddress,
          peerPublicPort,
          peerPrivateAddress,
          peerPrivatePort,
        };
        const hostMessage = {
          peerPublicAddress: publicAddress,
          peerPublicPort: publicPort,
          peerPrivateAddress: privateAddress,
          peerPrivatePort: privatePort,
        };
        socket.send(JSON.stringify(replyMessage), publicPort, publicAddress);
        socket.send(
          JSON.stringify(hostMessage),
          peerPublicPort,
          peerPublicAddress
        );
      }
    } else {
      // client is hosting
      const key = `${publicAddress}:${publicPort}-${privateAddress}:${privatePort}`;
      if (HOST_CODES.has(key)) {
        HOSTS.delete(HOST_CODES.get(key) as string);
      }
      const newHostCode = randomBytes(16).toString("hex");
      HOSTS.set(newHostCode, {
        publicAddress,
        publicPort,
        privateAddress,
        privatePort,
      });
      HOST_CODES.set(key, newHostCode);
      const replyMessage = { hostCode: newHostCode };
      socket.send(JSON.stringify(replyMessage), publicPort, publicAddress);
      setTimeout(() => {
        HOSTS.delete(newHostCode);
        HOST_CODES.delete(key);
      }, HOST_CODE_EXPIRATION_TIME);
    }
  });
}

main();
