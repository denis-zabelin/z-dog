using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class MainMenu : MonoBehaviour {
	
	public Transform player;
	public Transform[] respawns;
	public Texture gameMenuTexture;

	// window 0 - MainMenu
	// window 1 - Multiplayer
	// window 2 - Successfull connected || Error
	private int window;

	private int selGridInt = 0;
	private string[] selStrings = new string[] {"Создание", "Подключение"};  //server browser

	private string port = "25000";
	private string maxConnections = "4";
	private string ip = "127.0.0.1";
	private string password;

	public GUISkin skin;

	private bool startServer;
	private bool connectedGame;
	private bool connectedServer;
	private string error;

	private List<string> serverMessage = new List<string>();

	private bool isPressedKeyDownEnter;
	private bool isPressedKeyDownEscape;

	private bool menuOnEsc = false;
	
	// Update is called once per frame
	void Update () {
		if (serverMessage.Count > 14) {
			serverMessage.RemoveAt(0);
		}

		if (Input.GetKeyDown(KeyCode.Return)) {
			isPressedKeyDownEnter = true;
		}

		if (Input.GetKeyDown(KeyCode.Escape)) {
			isPressedKeyDownEscape = true;
		}

		if (Input.GetKeyDown(KeyCode.Escape) && connectedGame) {
			menuOnEsc = !menuOnEsc;
		}
	}

	void OnConnectedToServer() {
		connectedServer = true;
	}

	void OnFailedToConnect(NetworkConnectionError _error) {
		error = "" + _error;
	}

	void OnServerInitialized() {
		serverMessage.Add ("Server initialized and ready");
	}

	void OnPlayerConnected(NetworkPlayer _player) {
		serverMessage.Add ("Connected: " + _player.externalIP + " : " + _player.externalPort);
	}
	
	void CreatePlayer() {
		camera.enabled = false;
		camera.gameObject.GetComponent<AudioListener>().enabled = false;
		int tempRandom = Random.Range (0, respawns.Length - 1);
		Transform playerO = (Transform) Network.Instantiate (player, respawns[tempRandom].transform.position + new Vector3(Random.Range(0, 2), 0, Random.Range(0, 2)), respawns[tempRandom].transform.rotation, 0);
		playerO.GetComponentInChildren<Camera> ().camera.enabled = true;
		playerO.GetComponentInChildren<AudioListener> ().enabled = true;
	}
	
	void OnDisconnectedFromServer (NetworkDisconnection info) {
		Application.LoadLevel(Application.loadedLevel);
		connectedGame = false;
	}
	
	void OnPlayerDisconnected (NetworkPlayer pl) {
		Network.RemoveRPCs(pl);
		Network.DestroyPlayerObjects(pl);
		connectedServer = false;
	}

	void OnGUI() {
		GUI.skin = skin;
		if (!connectedGame) {
			// MainMenu
			if (window == 0) {
				Screen.showCursor = true;
				if (GUI.Button(new Rect(Screen.width / 2 - 100, Screen.height / 2 - 30, 200, 25), "Одиночная игра")) {
					Network.InitializeServer(0, int.Parse(port), false);
					connectedGame = true;
					CreatePlayer();
				}

				if (GUI.Button(new Rect(Screen.width / 2 - 100, Screen.height / 2, 200, 25), "Мультиплеер")) {
					window = 1;
				}

				if (GUI.Button(new Rect(Screen.width / 2 - 100, Screen.height / 2 + 30, 200, 25), "Выход")) {
					Application.Quit();
				}
			}
			else
			// Multiplayer
			if (window == 1) {
				GUI.Box(new Rect(20, 55, Screen.width - 40, Screen.height - 110), "");
				selGridInt = GUI.SelectionGrid(new Rect(25, 25, 110 * 3, 25), selGridInt, selStrings, 3);

				//Create server
				if (selGridInt == 0) {
					GUI.Label(new Rect(25, 65, 130, 25), "Порт:");
					port = GUI.TextField(new Rect(110, 65, 110, 20), "" + port);
					GUI.Label(new Rect(25, 95, 130, 25), "Кол-во подключений:");
					maxConnections = GUI.TextField(new Rect(160, 95, 60, 20), "" + maxConnections, 2);
					GUI.Label(new Rect(25, 125, 130, 25), "Пароль:");
					password = GUI.TextField(new Rect(110, 125, 110, 20), "" + password, 10);
					if (startServer == false) {
						if (GUI.Button(new Rect(25, 155, 110, 25), "Старт сервера") || isPressedKeyDownEnter) {
							isPressedKeyDownEnter = false;
							Network.incomingPassword = password;
							Network.InitializeServer(int.Parse(maxConnections), int.Parse(port), false); // TODO необходим ли NAT???
							startServer = true;
							serverMessage.Add("Running as server...");
						}
					}
					else {
						if (GUI.Button(new Rect(25, 155, 110, 25), "Закрыть сервер")) {
							Network.Disconnect(200);
							startServer = false;
							serverMessage.Add ("Successfull server closing");
						}
						if (GUI.Button(new Rect(25, 185, 110, 25), "Начать игру") || isPressedKeyDownEnter) {
							isPressedKeyDownEnter = false;
							connectedGame = true;
							CreatePlayer();
						}
					}
					if (GUI.Button(new Rect(25, 215, 110, 25), "Назад") || isPressedKeyDownEscape) {
						isPressedKeyDownEscape = false;
						window = 0;
					}

					GUI.Box(new Rect(Screen.width - Screen.width / 3 - 30, 65, Screen.width / 3, 300), "Server log:");
					for (int i = 0; i < serverMessage.Count; i++) {
						GUI.Label(new Rect(Screen.width-Screen.width / 3 - 25, 80 + i * 20, Screen.width / 3 - 10, 25), serverMessage[i]);
					}
				}

				//Connect Server
				if (selGridInt == 1) {
					GUI.Label(new Rect(25, 65, 120, 25), "IP:"); 
					ip = GUI.TextField(new Rect(55, 65, 105, 20), "" + ip);
					GUI.Label(new Rect(25, 95, 120, 25), "Порт:");
					port = GUI.TextField(new Rect(90, 95, 70, 20), "" + port);
					GUI.Label(new Rect(25, 125, 115, 25), "Пароль:");
					password = GUI.TextField(new Rect(90, 125, 70, 20), "" + password, 10);

					if (GUI.Button(new Rect(25, 155, 110, 25), "Подключиться") || isPressedKeyDownEnter) {
						isPressedKeyDownEnter = false;
						Network.Connect(ip, int.Parse(port), password);
						window = 2;
					}

					if (GUI.Button(new Rect(25, 215, 110, 25), "Назад") || isPressedKeyDownEscape) {
						isPressedKeyDownEscape = false;
						window = 0;
					}
				}
			}
			else
			if (window == 2) {
				if (connectedServer) {
					if (GUI.Button(new Rect(Screen.width / 2 - 100, Screen.height / 2 - 13, 200, 25), "Начать игру")) {
						connectedGame = true;
						CreatePlayer();
					}
					if (GUI.Button(new Rect(Screen.width / 2 - 100, Screen.height / 2 + 20, 200, 25), "Отключиться")) {
						Network.Disconnect(200);
						window = 1;
					}
				} else {
					GUI.Button(new Rect(Screen.width / 2 - 100, Screen.height / 2 - 63, 200, 25), "Ошибка");
					GUI.TextField(new Rect(Screen.width / 2 - 100, Screen.height / 2 - 30, 200, 25), "" + error);
					if (GUI.Button(new Rect(Screen.width / 2 - 100, Screen.height / 2 + 3, 200, 25), "Назад") || isPressedKeyDownEscape) {
						isPressedKeyDownEscape = false;
						window = 1;
					}
				}
			}
		} else {
			if(menuOnEsc) {
				Screen.showCursor = true;
				GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), gameMenuTexture, ScaleMode.StretchToFill, true, 0.0F);
				GUI.Label(new Rect((Screen.width - 100)/2, Screen.height/2 - 35, 200, 30), "Всего игроков: " + (Network.connections.Length + 1));
				if(GUI.Button(new Rect((Screen.width - 100)/2, Screen.height/2, 100, 30), "Отключиться")) 
					Network.Disconnect(200);
				
				if(GUI.Button(new Rect((Screen.width - 100)/2, Screen.height/2 + 35, 100, 30), "Выход"))
					Application.Quit();
			}
			else {
				Screen.showCursor = false;
			}
		}
	}
}