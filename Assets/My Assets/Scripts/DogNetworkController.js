#pragma strict

public var player : GameObject;
public var orbitCamera : Camera;
public var damageDealer : Transform;

public var players : ArrayList;

// для интерполяции 
private var lastSynchronizationTime : float = 0f;
private var syncDelay : float = 0f;
private var syncTime : float = 0f;
private var syncStartPosition : Vector3 = Vector3.zero;
private var syncEndPosition : Vector3 = Vector3.zero;
private var rotation : Quaternion;
private var numberOfCurrentAnimation : int;
private var dontInterpolateTimer : float = 2f;
// таймеры для просчета интерполяции
private var commonTimer : float;
private var myTimer : float;
/* Номера анимаций для синхронизации и выбора режима воспроизведения
1 - idle_01
2 - idle_02
3 - idle_03
4 - attack_01
5 - hit_01
6 - run_fast
7 - walk_silent
8 - walk
9 - walk_back
10 - turn_right
11 - turn_left
12 - jump
13 - bark
14 - digging
15 - eat
16 - idle_04
17 - idle_05
18 - death_01
19 - death_05
*/

private var mode : int;
private var characterMotor : CharacterMotor;
private var idleAnimationTimer : float = 0;
private var startIdleAnimation : boolean = true;
private var isJumping : boolean;
private var isDoingOncePlayedAnimation : boolean;
// Переменные смешанных анимаций
private var hit_01 : AnimationState;
private var attack_01 : AnimationState;
// система здоровья и полоска здоровья
public var currentHealth : int; // будет использовано для интерполяции
public var maxHealth : int = 10000;
public var healthTexture : Texture;
private var barWidth : float;
private var textureWidth : float;
private var menuOnEsc : boolean;

public var winTexture : Texture;
public var gameOverTexture : Texture;

private var speedRotation : float = 10f;
private var currentSpeed : float;
private var isDead : boolean = false;
private var isSynchronizedDead : boolean = false;
private var isAttacking : boolean = false;

private var damageTime : float;
private var damageTimer : float;

private var enemyDamageMin : int = 10;
private var enemyDamageMax : int  = 17;
private var enemyDamage : int = 0;
private var bodyPartsOfEnemy : GameObject[];

/*private var dogzDamageMin : int = 5;
private var dogzDamageMax : int = 10;
private var dogzDamage : int = 0;
private var dogzViewID : NetworkViewID = NetworkViewID.unassigned;*/


function Awake() {
	players = GameObject.Find("Players").GetComponent(Players).players;
	bodyPartsOfEnemy = GameObject.FindGameObjectsWithTag("EnemyPart");
	players.Add(gameObject);
	characterMotor = gameObject.GetComponent(CharacterMotor);
	animation["idle_01"].wrapMode = WrapMode.Loop;
	animation["idle_02"].wrapMode = WrapMode.Loop;
	animation["idle_03"].wrapMode = WrapMode.Loop;
	animation["idle_04"].wrapMode = WrapMode.Loop;
	animation["idle_05"].wrapMode = WrapMode.Loop;
	animation["death_01"].wrapMode = WrapMode.Once;
	animation["death_05"].wrapMode = WrapMode.Once;
	hit_01 = animation["hit_01"];
	attack_01 = animation["attack_01"];
	hit_01.layer = 10;
	hit_01.blendMode = AnimationBlendMode.Additive;
	hit_01.wrapMode = WrapMode.Once;
	attack_01.layer = 10;
	attack_01.blendMode = AnimationBlendMode.Additive;
	attack_01.wrapMode = WrapMode.Once;
	
	damageTime = animation["hit_01"].length;
	
	barWidth = Screen.width / 2;
	currentHealth = maxHealth;
	textureWidth  = barWidth - 10;
	menuOnEsc = false;
}

function Update () {
	if (player.networkView.isMine) {
		if (damageTimer > 0) damageTimer -= Time.deltaTime;
		currentSpeed = characterMotor.movement.velocity.magnitude;
		if (currentHealth > 0) {
			if (Input.GetKeyDown(KeyCode.Escape)) {
				menuOnEsc = !menuOnEsc;
			}
			
			if (mode == 0) {
				isDoingOncePlayedAnimation = false;
				idleAnimationTimer += Time.deltaTime;
				if (idleAnimationTimer >= 20) {
					startIdleAnimation = true;
				}
				if (startIdleAnimation) {
					idleAnimation();
					idleAnimationTimer = 0;
					startIdleAnimation = false;
				}
			}
			
			if (Input.GetMouseButtonDown(0) && !isDoingOncePlayedAnimation && damageTimer <= 0) {
				isAttacking = true;
				/*var hit : RaycastHit;
				Debug.Log(Physics.Raycast(damageDealer.position, damageDealer.forward, hit, 5));
				if (Physics.Raycast(damageDealer.position, damageDealer.forward, hit, 5)) {
					if (hit.collider.gameObject.name == "Dogz") {
						dogzDamage = Random.Range(dogzDamageMin, dogzDamageMax);
						dogzViewID = hit.collider.gameObject.networkView.viewID;
						hit.collider.gameObject.GetComponent(DogNetworkController).currentHealth -= dogzDamage;
					}
				}*/
				/*Debug.Log(gameObject.networkView.viewID);
				for (var player : GameObject in players) {
					Debug.Log(player.networkView.viewID);
					if (player == null || player.networkView.viewID == gameObject.networkView.viewID) continue;
					//if (Vector3.Distance(damageDealer.position, player.transform.position) < 6) {
						dogzDamage = 100;//Random.Range(dogzDamageMin, dogzDamageMax);
						dogzViewID = player.networkView.viewID;
						player.GetComponent(DogNetworkController).currentHealth -= dogzDamage;
					//}
				}*/
				
				for (var i : int = 0; i < bodyPartsOfEnemy.length; ++i) {
					//Debug.Log(Vector3.Distance(damageDealer.position, bodyPartsOfEnemy[i].transform.position));
					if (Vector3.Distance(damageDealer.position, bodyPartsOfEnemy[i].transform.position) < 1) {
						enemyDamage = Random.Range(enemyDamageMin, enemyDamageMax);
						bodyPartsOfEnemy[0].GetComponent(EnemyController).currentHealth -= enemyDamage;
						break;
					}
				}
				attackAnimation();
				damageTimer = damageTime;
			}

			if (Input.GetKey(KeyCode.W) && !isJumping) {
				isDoingOncePlayedAnimation = false;
				transform.eulerAngles = new Vector3(0, Mathf.LerpAngle(transform.eulerAngles.y, orbitCamera.transform.eulerAngles.y, Time.deltaTime * speedRotation), 0); 
				
				if (Input.GetKey(KeyCode.LeftShift)) {
					animation.CrossFade("run_fast");
					characterMotor.movement.maxForwardSpeed = 15.0;
					numberOfCurrentAnimation = 6;
				}
				else if (Input.GetKey(KeyCode.LeftControl)) {
					animation.CrossFade("walk_silent");
					characterMotor.movement.maxForwardSpeed = 3.0;
					numberOfCurrentAnimation = 7;
				}
				else {
					animation.CrossFade("walk");
					characterMotor.movement.maxForwardSpeed = 5.0;
					numberOfCurrentAnimation = 8;
				}
				mode = 2;
			}
			if (mode == 2 && !Input.GetKey(KeyCode.W)) {
				mode = 0;
				startIdleAnimation = true;
			}
			
			if (Input.GetKey(KeyCode.S) && !isJumping) {
				isDoingOncePlayedAnimation = false;
				transform.eulerAngles = new Vector3(0, Mathf.LerpAngle(transform.eulerAngles.y, orbitCamera.transform.eulerAngles.y, Time.deltaTime * speedRotation), 0);
				animation.CrossFade("walk_back");
				mode = 3;
				numberOfCurrentAnimation = 9;
			}
			if (mode == 3 && !Input.GetKey(KeyCode.S)) {
				mode = 0;
				startIdleAnimation = true;
			}
			
			if (Input.GetKey(KeyCode.D) && !Input.GetKey(KeyCode.W) && !Input.GetKey(KeyCode.S) && !isJumping) {
				isDoingOncePlayedAnimation = false;
				animation.CrossFade("turn_right");
				mode = 4;
				numberOfCurrentAnimation = 10;
			}
			if (mode == 4 && !Input.GetKey(KeyCode.D)) {
				mode = 0;
				startIdleAnimation = true;
			}

			if (Input.GetKey(KeyCode.A) && !Input.GetKey(KeyCode.W) && !Input.GetKey(KeyCode.S) && !isJumping) {
				isDoingOncePlayedAnimation = false;
				animation.CrossFade("turn_left");
				mode = 5;
				numberOfCurrentAnimation = 11;
			}
			if (mode == 5 && !Input.GetKey(KeyCode.A)) {
				mode = 0;
				startIdleAnimation = true;
			}
			
			if (Input.GetKeyDown(KeyCode.Space)) {
				isDoingOncePlayedAnimation = false;
				mode = 6;
				isJumping = true;
				animation.CrossFade("jump");
				numberOfCurrentAnimation = 12;
			}
			if (mode == 6 && characterMotor.grounded && !animation["jump"].enabled) {
				mode = 0;
				isJumping = false;
				startIdleAnimation = true;
			}
			
			if (Input.GetKeyDown(KeyCode.Q) && !isJumping) {
				animation.CrossFade("bark");
				isDoingOncePlayedAnimation = true;
				mode = 7;
				numberOfCurrentAnimation = 13;
			}
			if (mode == 7 && !animation.IsPlaying("bark")) {
				startIdleAnimation = true;
				mode = 0;
			}
			
			if (Input.GetKeyDown(KeyCode.E) && !isJumping) {
				animation.CrossFade("digging");
				isDoingOncePlayedAnimation = true;
				mode = 8;
				numberOfCurrentAnimation = 14;
			}
			if (mode == 8 && !animation.IsPlaying("digging")) {
				startIdleAnimation = true;
				mode = 0;
			}
			
			if (Input.GetKeyDown(KeyCode.F) && !isJumping) {
				animation.CrossFade("eat");
				isDoingOncePlayedAnimation = true;
				mode = 9;
				numberOfCurrentAnimation = 15;
			}
			if (mode == 9 && !animation.IsPlaying("eat")) {
				startIdleAnimation = true;
				mode = 0;
			}
			
			if (Input.GetKeyDown(KeyCode.X)) {
				animation.CrossFade("idle_04");
				isDoingOncePlayedAnimation = true;
				mode = 10;
				numberOfCurrentAnimation = 16;
			}
			
			if (Input.GetKeyDown(KeyCode.Z)) {
				animation.CrossFade("idle_05");
				isDoingOncePlayedAnimation = true;
				mode = 11;
				numberOfCurrentAnimation = 17;
			}
		} else {
			if (!isDead) {
				deathAnimation(currentSpeed);
				gameObject.GetComponent(FPSInputController).enabled = false;
				characterMotor.enabled = false;
				gameObject.GetComponent(CharacterController).enabled = false;
				isDead = true;
			}
		}
	} else {
		SyncedMovement(); // если это не мы, то вызываем интерполяцию
	}
}

function OnGUI() {
	var guiHealth = (currentHealth > 0)? currentHealth : 0;
	if (player.networkView.isMine && !menuOnEsc) {
		GUI.Box(new Rect(Screen.width - barWidth - 10, Screen.height - 50, barWidth, 40), guiHealth + " / " + maxHealth);
		if (healthTexture != null && textureWidth > 0) {
			var newWidthPlayer : float = textureWidth * guiHealth / maxHealth;
			if (newWidthPlayer > 0)
				GUI.DrawTexture(new Rect(Screen.width - newWidthPlayer - 15, Screen.height - 30, newWidthPlayer, 15), healthTexture, ScaleMode.ScaleAndCrop, true, 0f);
		}
		
		GUI.Box(new Rect(Screen.width / 4, 30, Screen.width / 2, 40), "Здоровье врага:");
		if (healthTexture != null) {
			var newWidthEnemy : float = Screen.width / 2 * bodyPartsOfEnemy[0].GetComponent(EnemyController).currentHealth / bodyPartsOfEnemy[0].GetComponent(EnemyController).maxHealth - 10;
			if (newWidthEnemy > 0)
				GUI.DrawTexture(new Rect((Screen.width - newWidthEnemy) / 2, 50, newWidthEnemy, 15), healthTexture, ScaleMode.ScaleAndCrop, true, 0f);
		}
		
		// проверка на проиггрыш
		var isAlive : boolean = false;
		for (var player : GameObject in players) {
			if (player != null && player.GetComponent(DogNetworkController).currentHealth > 0) {
				isAlive = true;
				break;
			}
		}
		if (!isAlive && gameOverTexture != null) {
			GUI.DrawTexture(new Rect((Screen.width - gameOverTexture.width) / 2, 100, gameOverTexture.width, gameOverTexture.height), gameOverTexture, ScaleMode.ScaleAndCrop, true, 0f);
		}
		
		// проверка на победу
		if (bodyPartsOfEnemy[0].GetComponent(EnemyController).currentHealth <= 0 && winTexture != null) {
		GUI.DrawTexture(new Rect((Screen.width - winTexture.width) / 2, 100, winTexture.width, winTexture.height), winTexture, ScaleMode.ScaleAndCrop, true, 0f);
		}
	}
}

function attackAnimation() {
	switch (Random.Range(1, 1)) {
		case 1:
			hit_01.weight = 1.0;
			hit_01.enabled = true;
//			numberOfCurrentAnimation = 4;
			break;
		case 2:
			attack_01.weight = 1.0;
			attack_01.enabled = true;
//			numberOfCurrentAnimation = 5;
	}
}

function SyncedMovement() {
	syncTime += Time.deltaTime;
	if (dontInterpolateTimer > 0) {
		dontInterpolateTimer -= Time.deltaTime;
		transform.position = syncEndPosition;
	} else {
		transform.position = Vector3.Lerp(syncStartPosition, syncEndPosition, syncTime / syncDelay);
	}
}

function OnSerializeNetworkView(stream : BitStream, info : NetworkMessageInfo) {
	var syncPosition : Vector3 = Vector3.zero;
	if (stream.isWriting) {
		rotation = transform.rotation;
		syncPosition = transform.position;
		
		stream.Serialize(syncPosition);
		stream.Serialize(rotation);
		stream.Serialize(numberOfCurrentAnimation);
		stream.Serialize(commonTimer);
		stream.Serialize(isAttacking);
		stream.Serialize(isSynchronizedDead);
		stream.Serialize(currentHealth);
		stream.Serialize(currentSpeed);
		stream.Serialize(enemyDamage);
		//stream.Serialize(dogzDamage);
		//stream.Serialize(dogzViewID);
		
		// переменные - в исходное положение
		isAttacking = false;
		enemyDamage = 0;
		//dogzDamage = 0;
		//dogzViewID = NetworkViewID.unassigned;
		
	} else {
		stream.Serialize(syncPosition);
		stream.Serialize(rotation);
		stream.Serialize(numberOfCurrentAnimation);
		stream.Serialize(commonTimer);
		stream.Serialize(isAttacking);
		stream.Serialize(isSynchronizedDead);
		stream.Serialize(currentHealth);
		stream.Serialize(currentSpeed);
		stream.Serialize(enemyDamage);
		//stream.Serialize(dogzDamage);
		//stream.Serialize(dogzViewID);
		
		if (enemyDamage > 0) {
			GameObject.Find("Enemy").GetComponent(EnemyController).currentHealth -= enemyDamage;
		}
		/*Debug.Log("SerializeViewID" + gameObject.networkView.viewID);
		if (dogzDamage > 0) {
			Debug.Log(gameObject.networkView.viewID);
			Debug.Log(dogzViewID);
			if (gameObject.networkView.viewID == dogzViewID) {
				currentHealth -= dogzDamage;
			}
		}*/
		
		if (currentHealth > 0) {
			if (isAttacking) {
				attackAnimation(); // фикс - синхронизирования анимации атаки
			}
			PlayAnimation(numberOfCurrentAnimation);
		} else if (!isSynchronizedDead) {
			deathAnimation(currentSpeed);
			characterMotor.enabled = false;
			gameObject.GetComponent(CharacterController).enabled = false;
			isSynchronizedDead = true;
		}
		transform.rotation = rotation;
		// Находим время между текущим моментом и последней синхронизацией
		syncTime = 0f;
		syncDelay = Time.time - lastSynchronizationTime;
		lastSynchronizationTime = Time.time;
		syncStartPosition = transform.position;
        syncEndPosition = syncPosition;
		//Debug.Log(networkView.viewID + " " + syncStartPosition + " " + syncEndPosition);
	}
}

function PlayAnimation(numberAnimation : int) {
	switch (numberOfCurrentAnimation) {
		case 1:
			animation.CrossFade("idle_01");
			break;
		case 2:
			animation.CrossFade("idle_02");
			break;
		case 3:
			animation.CrossFade("idle_03");
			break;
		case 4:
			hit_01.weight = 1.0;
			hit_01.enabled = true;
			break;
		case 5:
			attack_01.weight = 1.0;
			attack_01.enabled = true;
			break;
		case 6:
			animation.CrossFade("run_fast");
			break;
		case 7:
			animation.CrossFade("walk_silent");
			break;
		case 8:
			animation.CrossFade("walk");
			break;
		case 9:
			animation.CrossFade("walk_back");
			break;
		case 10:
			animation.CrossFade("turn_right");
			break;
		case 11:
			animation.CrossFade("turn_left");
			break;
		case 12:
			animation.CrossFade("jump");
			break;
		case 13:
			animation.CrossFade("bark");
			break;
		case 14:
			animation.CrossFade("digging");
			break;
		case 15:
			animation.CrossFade("eat");
			break;
		case 16:
			animation.CrossFade("idle_04");
			break;
		case 17:
			animation.CrossFade("idle_05");
			break;
	}
}

function idleAnimation() {
	switch (Random.Range(1, 3)) {
		case 1:
			animation.CrossFade("idle_01");
			numberOfCurrentAnimation = 1;
			break;
		case 2:
			animation.CrossFade("idle_02");
			numberOfCurrentAnimation = 2;
			break;
		case 3:
			animation.CrossFade("idle_03");
			numberOfCurrentAnimation = 3;
	}
}

function deathAnimation(currentSpeed : float) {
	switch (Random.Range(1, 2)) {
		case 1:
			animation.CrossFade("death_01");
			numberOfCurrentAnimation = 18;
			break;
		case 2:
			animation.CrossFade("death_05");
			numberOfCurrentAnimation = 19;
	}
}