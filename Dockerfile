FROM node:slim

COPY package*.json interval.js ./
RUN npm install

EXPOSE 8080

CMD [ "node", "interval.js" ]