const express = require('express');
const ws = require('ws');

const app = express();
//All clients
const clients = {};
//All running games
const games = {};
const onGoingTeamEvents = {};
const wsServer = new ws.Server({
	noServer: true
});

const server = app.listen(3000, (err) => {
	if (!err)
		console.log("server booted!");
	else {
		console.log("server error" + err);
	}
});

server.on('upgrade', (request, socket, head) => {
	wsServer.handleUpgrade(request, socket, head, socket => {
		wsServer.emit('connection', socket, request);
	});
});




wsServer.on('connection', conn => {
	const clientId = guid();

	//Identify new client
	clients[clientId] = {
		"connection": conn
	}

	const payLoad = {
		"method": "connected",
		"clientId": clientId
	}

	// confirm connection to client
	conn.send(JSON.stringify(payLoad));

	console.log("connected client" + clientId);

	conn.on("open", function(code, reason) {
		console.log("Connection opened");
	})

	conn.on("close", function(code, reason) {
		console.log("Connection closed");
	})

	//on recieving a message
	conn.on('message', str => {
		// All messages sent and recieved in JSON format
		const result = JSON.parse(str);
		console.log("got" + JSON.stringify(result));
		switch (result.method) {

			case "TeamEvent": {
				let clientId = result["clientId"];
				let gameID = result["gameId"];
				let teamId = result["teamId"];
				let data = result["data"];
				if (!gameID)
					return;
				const game = games[gameID];
				if (!game || game == undefined)
					return;
				let team = null;
				//console.log("check team" + teamId);

				for (let i = 0; i < game.teams.length; i++) {

					if (game.teams[i]["id"] == teamId) {
						//console.log(game.teams[i]["id"] + " " + teamId + "comapre team" + JSON.stringify(game.teams[i]));
						team = game.teams[i];

						break;
					}
				}
				if (!team)
					return;
				//check if this is a new event, create one if not exists
				let eventID = null;
				if (!result["eventID"]) {
					eventID = guid();
					onGoingTeamEvents[eventID] = {
						"data": data,
						"complete": false,
						"acceptedClients": [clientId],
						"rejectedClients": [],
						"teamId": teamId
					};
				} else {
					eventID = result["eventID"];
				}

				//console.log("recived here" + result["type"]);
				if (result["type"] == "confirmCreate") {
					// some accpeted

					//console.log(onGoingTeamEvents[eventID].acceptedClients.length + "in confirm" + team.clients.length);
					if (onGoingTeamEvents[eventID].acceptedClients.indexOf(clientId) < 0) {
						onGoingTeamEvents[eventID].acceptedClients.push(clientId);
					}
					// if everyone has accepted
					if (onGoingTeamEvents[eventID].acceptedClients.length == team.clients.length - 1) {
						onGoingTeamEvents[eventID].complete = true;
						delete onGoingTeamEvents[eventID];
						// ask everyone to execute

						let toSend = {
							"type": "confirm",
							"data": data
						}
						team.clients.forEach((id) => {

							let payload2 = {
								"method": "teamEvent",
								"data": toSend
							};
							clients[id].connection.send(JSON.stringify(payload2));

							// Inform all clients to in the team about this event
						});

					}
				} else if (result["type"] == "rejectCreate") {

					//got a rejection
					if (onGoingTeamEvents[eventID].rejectedClients.indexOf(clientId) < 0) {
						onGoingTeamEvents[eventID].rejectedClients.push(clientId);
					}
					//console.log(onGoingTeamEvents[eventID].rejectedClients.length + "in reject" + team.clients.length);
					//if everyone has rejected
					if (onGoingTeamEvents[eventID].rejectedClients.length == team.clients.length - 1) {
						delete onGoingTeamEvents[eventID];
					}

				} else {
					//ask for acceptance

					let toSend = {
						"type": "acceptRequest",
						"data": data
					}
					if (team.clients.length > 1) {
						team.clients.forEach((id) => {
							//do not sent to the current client
							if (id != clientId) {
								let payload2 = {
									"method": "teamEvent",
									"data": toSend,
									"teamId": teamId,
									"clientId": clientId,
									"eventID": eventID
								}

								clients[id].connection.send(JSON.stringify(payload2));
								// Inform all clients to in the team about this event
							}
						});
					} else {
						onGoingTeamEvents[eventID].complete = true;
						delete onGoingTeamEvents[eventID];
						// ask everyone to execute

						let toSend = {
							"type": "confirm",
							"data": data
						}
						team.clients.forEach((id) => {

							let payload2 = {
								"method": "teamEvent",
								"data": toSend
							};
							clients[id].connection.send(JSON.stringify(payload2));

							// Inform all clients to in the team about this event
						});

					}







				}
			}
			break;
		case "GameEvent": {
			let clientId = result["clientId"];
			let gameID = result["gameId"];
			if (!gameID)
				return;
			const game = games[gameID];
			if (!game || game == undefined)
				return;
			if (game.clients) {
				game.clients.forEach((clientId) => {
					if (client.clientId != clientId) {
						let payload2 = {
							"method": "gameEvent",
							"gameId": gameID
						};
						clients[client.clientId].connection.send(JSON.stringify(payload2));
						// Inform all clients to start the game
					}
				});
			}
		}
		break;
		case "createGame": {
			let clientId = result["clientId"];
			let gameID = guid();

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

			// adding this client to the game
			game.clients.push({
				"clientId": clientId,
				"color": color
			});

			const payLoad = {
				"method": "gameCreated",
				"game": games[gameID]
			}

			let conn = clients[clientId].connection;
			conn.send(JSON.stringify(payLoad));
			//notify  client game was created

			const payLoad2 = {
				"method": "joinedGame",
				"game": game
			};
			conn.send(JSON.stringify(payLoad2));
			//notify  client joined the game

		}
		break;
		case "startGame": {
			let clientId = result["clientId"];
			let gameID = result["gameId"];
			if (!gameID)
				return;
			const game = games[gameID];
			if (!game || game == undefined)
				return;
			if (game.clients) {
				game.clients.forEach((client) => {
					if (client.clientId != clientId) {
						let payload2 = {
							"method": "startedGame",
							"gameId": gameID
						};
						clients[client.clientId].connection.send(JSON.stringify(payload2));
						// Inform all clients to start the game

					}
				});
			}
		}
		break;
		case "createTeam": {

			let clientId = result["clientId"];
			let gameID = result["gameId"];
			if (!gameID)
				return;
			const game = games[gameID];
			if (!game || game == undefined)
				return;
			let teamId = result["teamId"];
			// Create a new team in the game
			let team = {
				"id": teamId,
				"game": gameID,
				"clients": []
			}
			game.teams.push(team);

			if (game.clients) {
				game.clients.forEach((client) => {
					let payload2 = {
						"method": "createdTeam",
						"teamId": teamId,
						"gameId": gameID
					};
					clients[client.clientId].connection.send(JSON.stringify(payload2));
					// Inform all clients about this new team
				});
			}
		}
		break;
		case "joinGame": {
			let clientId = result["clientId"];

			let gameID = result["gameId"];
			if (!gameID)
				return;
			const game = games[gameID];
			if (!game || game == undefined)
				return;

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
				// adding this client to the games
				if (game.clients) {
					game.clients.forEach((client) => {
						let payload2 = {
							"method": "joinedGame",
							"game": game
						};
						//inform all clients about this new member
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
			let oldteamId = null;
			if (result["PrevteamId"])
				oldteamId = result["PrevteamId"];
			//check if player was already a part of some other team
			game.teams.forEach((item, i) => {
				// add them to new team
				if (item["id"] == teamId) {
					if (item["clients"].indexOf(clientId) < 0)
						item["clients"].push(clientId);
				}
				if (oldteamId) {
					// remove them from old team
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
					// inform all clients about this new team member
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