const express = require('express');
const ws = require('ws');
const clients = {};
const games = {};
const app = express();

// Set up a headless websocket server that prints any
// events that come in.
const wsServer = new ws.Server({
	noServer: true
});
wsServer.on('connection', conn => {
	const clientId = guid();

	clients[clientId] = {
		"connection": conn
	}
	const payLoad = {
		"method": "connect",
		"clientId": clientId
	}
	conn.send(JSON.stringify(payLoad));
	console.log("connected client" + clientId);
	conn.on("close", function(code, reason) {
		console.log("Connection closed");
	})
	conn.on("open", function(code, reason) {
		console.log("Connection opened");
	})

	console.log("client created" + clientId);
	conn.on('message', message => {
		console.log("message" + message)
		let str = message;

		const result = JSON.parse(str);
		console.log("Recieved message" + str);
		switch (result.method) {
			case "create": {
				let clientId = result["clientId"];

				let gameID = guid();
				console.log("create a new game " + gameID + " by" + clientId);
				games[gameID] = {
					"id": gameID,
					"rows": 10,
					"col": 10,
					"clients": [],
					"teams": []
				}
				let game = games[gameID];
				let color = {
					"0": "WHITE",
					"1": "BLACK",
					"2": "MAGENTA",
					"3": "GRAY",
					"4": "RED",
					"5": "GREEN",
					"6": "BLUE",
					"7": "YELLOW",
					"8": "ORANGE",
					"9": "CYAN"
				} [game.clients.length];

				game.clients.push({
					"clientId": clientId,
					"color": color
				});

				const payLoad = {
					"method": "create",
					"game": games[gameID]
				}
				let conn = clients[clientId].connection;
				conn.send(JSON.stringify(payLoad));
				const payLoad2 = {
					"method": "join",
					"game": game
				};
				conn.send(JSON.stringify(payLoad2));

			}
			break;
		case "move": {
			let clientId = result["clientId"];

			let gameID = result["gameId"];
			if (!gameID)
				return;
			const game = games[gameID];
			if (!game || game == undefined)
				return;
			let position = result["position"];
			console.log("move" + clientId + "to" + position);

			if (game.clients) {
				game.clients.forEach((client) => {
					let payload2 = {
						"method": "moved",
						"clientId": clientId,
						"newPosition": position
					};
					if (client.clientId !== clientId)
						clients[client.clientId].connection.send(JSON.stringify(payload2));

				});
			}
		}
		break;
		case "createTeam": {
			console.log("createTeam");
			let clientId = result["clientId"];

			let gameID = result["gameId"];
			if (!gameID)
				return;
			const game = games[gameID];
			if (!game || game == undefined)
				return;
			let teamId = result["teamId"];

			console.log("create a new team " + teamId + " by" + clientId);
			let team = {
				"id": teamId,
				"game": gameID,
				"clients": []
			}
			game.teams.push(team);

			console.log("createTeam" + teamId);

			if (game.clients) {
				game.clients.forEach((client) => {
					let payload2 = {
						"method": "createTeam",
						"teamId": teamId,
						"gameId": gameID
					};
					clients[client.clientId].connection.send(JSON.stringify(payload2));

				});
			}
		}
		break;
		case "join": {
			let clientId = result["clientId"];

			let gameID = result["gameId"];
			console.log("join a  game " + gameID + " request by" + clientId);
			if (!gameID)
				return;
			const game = games[gameID];
			if (!game || game == undefined)
				return;
			console.log("the game is" + game);
			let clientsCount = game.clients.length;
			if (clientsCount > 9) {
				return;
			} else {
				let color = {
					"0": "WHITE",
					"1": "BLACK",
					"2": "MAGENTA",
					"3": "GRAY",
					"4": "RED",
					"5": "GREEN",
					"6": "BLUE",
					"7": "YELLOW",
					"8": "ORANGE",
					"9": "CYAN"
				} [game.clients.length];

				game.clients.push({
					"clientId": clientId,
					"color": color
				});
				console.log("all clients" + game.clients + " game is" + JSON.stringify(game));

				if (game.clients) {
					game.clients.forEach((client) => {
						let payload2 = {
							"method": "join",
							"game": game
						};
						//		console.log("check client" + JSON.stringify(client) + "send" + clients[client.clientId].connection + "is");
						clients[client.clientId].connection.send(JSON.stringify(payload2));

					});
				}



			}
		}
		break;
		case "joinTeam": {
			let clientId = result["clientId"];

			let gameID = result["gameId"];
			if (!gameID)
				return;
			const game = games[gameID];
			if (!game || game == undefined)
				return;
			let teamId = result["teamId"];
			console.log("join a  team " + teamId + " request by" + clientId);
			let oldteamId = null;
			if (result["PrevteamId"])
				oldteamId = result["PrevteamId"];
			game.teams.forEach((item, i) => {
				if (item["id"] == teamId) {
					if (item["clients"].indexOf(clientId) < 0)
						item["clients"].push(clientId);
				}
				if (oldteamId) {
					if (item["id"] == oldteamId) {
						const index = item["clients"].indexOf(5);
						if (index > -1) {
							item["clients"].splice(index, 1); // 2nd parameter means remove one item only
						}
					}
				}
			});

			if (game.clients) {
				game.clients.forEach((client) => {
					let payload2 = {
						"method": "addToTeam",
						"clientId": clientId,
						"teamId": teamId,
						"gameId": gameID,
					};
					//		console.log("check client" + JSON.stringify(client) + "send" + clients[client.clientId].connection + "is");
					clients[client.clientId].connection.send(JSON.stringify(payload2));

				});
			}



		}

		break;

		default:

		}

	});

});

// `server` is a vanilla Node.js HTTP server, so use
// the same ws upgrade process described here:
// https://www.npmjs.com/package/ws#multiple-servers-sharing-a-single-https-server
const server = app.listen(3000, (err) => {
	if (!err)
		console.log("server booted!");
	else {
		console.log("server err" + err);
	}
});
server.on('upgrade', (request, socket, head) => {
	wsServer.handleUpgrade(request, socket, head, socket => {
		wsServer.emit('connection', socket, request);
	});
});


function broadcast(server, msg) {
	server.connections.forEach(function(conn) {
		conn.sendText(msg)
	})
}

function S4() {
	return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

// then to call it, plus stitch in '4' in the third group
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();