//This is a multistage docker file for node application
FROM node:19-alpine as first
WORKDIR /app
COPY package*.json .
RUN npm install 
COPY . .


FROM first as final
RUN npm install --production
COPY . .
CMD ["node" , "index.js"]

