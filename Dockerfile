FROM node:14

EXPOSE 6363

WORKDIR /usr/src

# Copy files
COPY package.json traversalServer.ts tsconfig.json yarn.lock ./

# Install dependencies
RUN yarn install

# Compile script
RUN yarn tsc

ENTRYPOINT ["node", "traversalServer.js"]
