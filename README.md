# Basic Redis Cache with Nodejs

## Introduction

This project is a Node.js application that demonstrates the use of caching mechanisms with Redis and MySQL. The application provides APIs to manage user data with different caching strategies such as Lazy Loading, Write Through, and Write Back. The project is containerized using Docker and Docker Compose for easy setup and deployment.

## Technologies Used

- **Node.js**: JavaScript runtime for building the server-side application.
- **Express**: Web framework for Node.js to handle HTTP requests.
- **TypeScript**: Superset of JavaScript that adds static typing.
- **MySQL**: Relational database management system.
- **Redis**: In-memory data structure store used as a cache.
- **Docker**: Platform for developing, shipping, and running applications in containers.
- **Docker Compose**: Tool for defining and running multi-container Docker applications.
- **Node-cron**: Library for scheduling tasks in Node.js.

## Installation

### Prerequisites

- Docker
- Docker Compose

### Steps

1. **Clone the repository**:
    ```sh
    git clone <repository-url>
    cd <repository-directory>
    ```

2. **Build and start the Docker containers**:
    ```sh
    docker-compose up --build
    ```

3. **Access the application**:
    - The Node.js server will be running on `http://localhost:8001`.
    - phpMyAdmin will be accessible at `http://localhost:8081` for managing the MySQL database.
    - Redis will be running on `localhost:6379`.

### API Endpoints

- **GET /**: Test API to check if the server is running.
- **GET /users/cache-1**: Get all users using Lazy Loading caching strategy.
- **GET /users/cache-2**: Get all users using Write Through caching strategy.
- **POST /users/cache-2**: Add a new user using Write Through caching strategy.
- **GET /users/cache-3**: Get all users using Write Back caching strategy.
- **PUT /users/cache-3/:id**: Update a user using Write Back caching strategy.

### Configuration

- **MySQL**:
    - Host: [mysql](http://_vscodecontentref_/0)
    - User: `root`
    - Password: `root`
    - Database: `mydb`
    - Port: `3306`

- **Redis**:
    - Host: [redis-cache](http://_vscodecontentref_/1)
    - Port: `6379`

### Project Structure

- [index.ts](http://_vscodecontentref_/2): Main application file.
- [interface.ts](http://_vscodecontentref_/3): TypeScript interfaces.
- [Dockerfile](http://_vscodecontentref_/4): Docker configuration for the Node.js application.
- [docker-compose.yml](http://_vscodecontentref_/5): Docker Compose configuration for multi-container setup.
- [.dockerignore](http://_vscodecontentref_/6): Files and directories to ignore in the Docker build.
- [package.json](http://_vscodecontentref_/7): Project dependencies and scripts.
- [tsconfig.json](http://_vscodecontentref_/8): TypeScript configuration.



> Written with [StackEdit](https://stackedit.io/).
