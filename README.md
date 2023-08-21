### p2p-cache


# P2P Caching Service

This is a simple peer-to-peer (P2P) caching service that allows you to cache
data across multiple nodes in a P2P network. The service exposes a `/cache`
endpoint which accepts data in the JSON schema `{'key': 'foo', 'value: 'bar'}`
to store and distribute the cached information


## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Installation

To install and run the P2P caching service, follow these steps

1. Clone the repository

```
$ git clone https://github.com/tuxcanfly/p2p-cache.git
```


2. Install the required dependencies

```
$ npm install
```


3. Start a peer

```
$ npm start 3000
```

4. Start a remote peer (Optional)

```
$ npm start 4000 <peer-multiaddr>
```


Congratulations! The P2P caching service is now up and running on your local
machine

## Usage

Once the service is running, you can start interacting with it through the
provided API endpoints. The service allows you to cache data across all nodes
in the P2P network by using the `/cache` endpoint

## API Endpoints

### `/cache` (POST)

This endpoint accepts JSON data in the following format to cache information
across all nodes in the P2P network

```json
{
    "key": "foo",
    "value": "bar"
}
```

### `/cache` (GET)

This endpoint queries the JSON data by key across all nodes in the P2P network

## Contributing

We welcome contributions to enhance the functionality, add new features, or
solve issues of this P2P caching service. If you would like to contribute,
please follow these steps

1. Fork the repository
2. Create a new branch
3. Make your changes and commit them
4. Push your changes to the forked repository
5. Submit a pull request

## License

[MIT License](https://opensource.org/licenses/MIT)
