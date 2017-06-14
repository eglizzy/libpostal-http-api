FROM chatmeter/nodepostal

RUN mkdir -p /var/www/libpostal-http-api
WORKDIR /var/www/libpostal-http-api
COPY . .
RUN rm -rf node_modules && npm install

ENTRYPOINT pm2-docker start npm -- start