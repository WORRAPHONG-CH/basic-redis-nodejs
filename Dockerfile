# select runtime [select node v18]
FROM node:18

# define main directory in container
WORKDIR /usr/src/app

# Copy file package from local to container
COPY ./package*.json ./ 

# Run command to install nodemodule from package.json
RUN npm install

# copy all file to container [. => all file exclude file in .dockerignore | ./ => /usr/src/app]
COPY . ./

# expose port for allow external can access 
EXPOSE 8001

# Define command for run initial application
CMD ["npm","run","dev"]