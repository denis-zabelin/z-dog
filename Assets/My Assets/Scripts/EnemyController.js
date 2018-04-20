public var target : Transform;
public var spawnBullet : Transform;
public var bullet : GameObject;
private var agent : NavMeshAgent;

private var shootRangeMax : float = 30f;
private var shootRangeMin : float = 10f;
private var meleeRange : float = 3f;

private var shootAttackTime : float;
private var shootAttackTimer : float;
private var sightingTime : float = 1f;
private var sightingTimer : float = 1f;

private var meleeDamageMin : float = 4f;
private var meleeDamageMax : float = 7f;
private var meleeAttackTime : float;
private var meleeAttackTimer : float;
private var meleeDamage : int; // синхронизация рукопашной аттаки
private var targetViewIDDamaged : NetworkViewID; // viewID цели рукопашной атаки

public var currentHealth : int;
public var maxHealth : int = 500;

public var players : ArrayList;
private var timeForStartAnimation : float = 1f;

public var body : Transform;
public var weapon : Transform;

public var ragdoll : ObjectRagdoll;
private var isRagdolled : boolean = false;

// для интерполяции
private var lastSynchronizationTime : float = 0f;
private var syncDelay : float = 0f;
private var syncTime : float = 0f;
private var syncStartPosition : Vector3 = Vector3.zero;
private var syncEndPosition : Vector3 = Vector3.zero;
private var rotation : Quaternion;
private var numberOfCurrentAnimation : int;
private var commonTimer : float;
private var dontInterpolateTimer : float = 10f;

private var speedRotation : float = 10f;

private var angleRecoilX : float = 10f;
private var angleRecoilY : float = 2.5f;
private var bulletQuaternion : Quaternion; // Кватернион старта плули (для синхронизации)
private var isShooted : boolean = false; // выстрелил ли бот (для синхронизации)

function Awake() {
	players = GameObject.Find("Players").GetComponent(Players).players;
	ragdoll = gameObject.GetComponent(ObjectRagdoll);
	currentHealth = maxHealth;
	agent = this.GetComponent("NavMeshAgent");
	shootAttackTime = body.animation["Standing_Fire_One_Shot"].length;
	meleeAttackTime = body.animation["Mele_1_with_weapon"].length;
}

function Update() {
	//Debug.Log(currentHealth);
	if (Network.isServer) {
		if (currentHealth > 0) {
			if (target != null) { // если есть враг
				if (target.GetComponent(DogNetworkController).currentHealth <= 0) {
					target = null;
					agent.ResetPath();
					return;
				}
				
				for (var j : int = 0; j < players.Count; ++j) {
					if (players[j] != null) {
						if (players[j].transform != target && players[j].GetComponent(DogNetworkController).currentHealth > 0) {
							if (Vector3.Distance(transform.position, players[j].transform.position) < 2f && Vector3.Distance(transform.position, players[j].transform.position) < Vector3.Distance(transform.position, target.position)) {
								target = players[j].transform;
							}
						}
					}
				}
				
				if (!Physics.Linecast(transform.position, target.position)) { // если не за стеной
					var tempDistance : float = Vector3.Distance(transform.position, target.position);
					//Debug.Log(tempDistance);
					if (tempDistance < shootRangeMax && tempDistance > shootRangeMin) { // здесь стреляет
						agent.Stop();
						// развернуть к цели
						transform.eulerAngles = new Vector3(0, Mathf.LerpAngle(transform.eulerAngles.y, new Quaternion.LookRotation(target.position - transform.position).eulerAngles.y, Time.deltaTime * speedRotation), 0);
						if (sightingTimer > 0) {
							sightingTimer -= Time.deltaTime;
							if (meleeAttackTimer > 0) {
								meleeAttackTimer -= Time.deltaTime;
							} else {
								numberOfCurrentAnimation = 1;
								PlayAnimation(numberOfCurrentAnimation);
							}
						} else {
							if (shootAttackTimer > 0) {
								shootAttackTimer -= Time.deltaTime;
							} else {
								if (meleeAttackTimer > 0) {
										meleeAttackTimer -= Time.deltaTime;
								} else {
									numberOfCurrentAnimation = 5;
									PlayAnimation(numberOfCurrentAnimation);
									bulletQuaternion = spawnBullet.rotation;
									bulletQuaternion.eulerAngles.x += Mathf.Acos((target.position.y - spawnBullet.position.y) / Vector3.Distance(target.position, spawnBullet.position)) + Random.Range(0, angleRecoilX);
									bulletQuaternion.eulerAngles.y += Random.Range(-angleRecoilY, angleRecoilY);
									Instantiate(bullet, spawnBullet.position, bulletQuaternion);
									isShooted = true;
								}
								shootAttackTimer = shootAttackTime;
							}
						}
					} else if (tempDistance < shootRangeMin && tempDistance > meleeRange) { // подбегает для удара
						if (meleeAttackTimer > 0) {
							meleeAttackTimer -= Time.deltaTime;
						} else {
							agent.SetDestination(target.position);
							numberOfCurrentAnimation = 2;
							PlayAnimation(numberOfCurrentAnimation);
						}
						shootAttackTimer = 0;
						sightingTimer = sightingTime;
					} else if (tempDistance < meleeRange) { // ударяет
						agent.Stop();
						// развернуть к цели
						transform.eulerAngles = new Vector3(0, Mathf.LerpAngle(transform.eulerAngles.y, new Quaternion.LookRotation(target.position - transform.position).eulerAngles.y, Time.deltaTime * speedRotation), 0);
						if (meleeAttackTimer > 0) {
							meleeAttackTimer -= Time.deltaTime;
						} else {
							numberOfCurrentAnimation = 4;
							PlayAnimation(numberOfCurrentAnimation);
							meleeDamage = Random.Range(meleeDamageMin, meleeDamageMax);
							targetViewIDDamaged = target.networkView.viewID;
							target.GetComponent(DogNetworkController).currentHealth -= meleeDamage;
							meleeAttackTimer = meleeAttackTime;
						}
					} else { // подбегает для стрельбы
						if (meleeAttackTimer > 0) {
							meleeAttackTimer -= Time.deltaTime;
						} else {
							agent.SetDestination(target.position);
							numberOfCurrentAnimation = 3;
							PlayAnimation(numberOfCurrentAnimation);
						}
						sightingTimer = sightingTime;
					}
				} else {
					if (meleeAttackTimer > 0) {
						meleeAttackTimer -= Time.deltaTime;
					} else {
						agent.SetDestination(target.position);
						numberOfCurrentAnimation = 2;
						PlayAnimation(numberOfCurrentAnimation);
					}
					timeForStartAnimation = 0;
					shootAttackTimer = 0;
					sightingTimer = sightingTime;
				}
			} else {
				for (var i : int = 0; i < players.Count; ++i) {
					if (players[i] != null && players[i].GetComponent(DogNetworkController).currentHealth > 0) {
						if (!Physics.Linecast(transform.position, players[i].transform.position)) {
							target = players[i].transform;
						}
					}
				}
				shootAttackTimer = 0;
				sightingTimer = sightingTime;
				if (meleeAttackTimer > 0) {
					meleeAttackTimer -= Time.deltaTime;
				} else {
					numberOfCurrentAnimation = 1;
					PlayAnimation(numberOfCurrentAnimation);
				}
			}
		} else {
			// активируем ragdoll
			if (!isRagdolled) {
				body.animation.Stop();
				weapon.animation.Stop();
				agent.enabled = false;
				ragdoll.ragdollActive();
				isRagdolled = true;
			}
		}
	} else {
		SyncedMovement();
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
	if (currentHealth > 0) {
			PlayAnimation(numberOfCurrentAnimation);
	} else if (!ragdoll.isActive) {
		ragdoll.ragdollActive();
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
		stream.Serialize(currentHealth);
		stream.Serialize(bulletQuaternion);
		stream.Serialize(isShooted);
		stream.Serialize(meleeDamage);
		stream.Serialize(targetViewIDDamaged);
		
		isShooted = false; // возвращаем в исходные значения
		targetViewIDDamaged = NetworkViewID.unassigned;
	} else {
		stream.Serialize(syncPosition);
		stream.Serialize(rotation);
		stream.Serialize(numberOfCurrentAnimation);
		stream.Serialize(commonTimer);
		stream.Serialize(currentHealth);
		stream.Serialize(bulletQuaternion);
		stream.Serialize(isShooted);
		stream.Serialize(meleeDamage);
		stream.Serialize(targetViewIDDamaged);
		
		if (targetViewIDDamaged != NetworkViewID.unassigned) {
			for (var i : int = 0; i < players.Count; ++i) {
				if (players[i] != null) {
					if (players[i].networkView.viewID == targetViewIDDamaged) {
						players[i].GetComponent(DogNetworkController).currentHealth -= meleeDamage;
					}
				}
			}
		}
		
		if (isShooted) {
			Instantiate(bullet, spawnBullet.position, bulletQuaternion);
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

function PlayAnimation(number : int) {
	//Debug.Log("I'm playing animation"); TODO у клиента не зацикливается анимация (останавливается)
	switch (number) {
		case 1:
			body.animation.CrossFade("Standing_Aim_Idle");
			weapon.animation.CrossFade("Standing_Aim_Idle");
			break;
		case 2:
			body.animation.CrossFade("Run_Forward_Weapon");
			weapon.animation.CrossFade("Run_Forward_Weapon");
			break;
		case 3:
			body.animation.CrossFade("Run_Forward_Aim");
			weapon.animation.CrossFade("Run_Forward_Aim");
			break;
		case 4:
			body.animation.CrossFade("Mele_1_with_weapon");
			weapon.animation.CrossFade("Mele_1_with_weapon");
			break;
		case 5:
			body.animation.CrossFade("Standing_Fire_One_Shot");
			weapon.animation.CrossFade("Standing_Fire_One_Shot");
			break;
	}
}
