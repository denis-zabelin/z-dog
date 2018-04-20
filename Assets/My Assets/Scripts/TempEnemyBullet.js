var speed : float = 50f;
var minDamage : float = 5f;
var maxDamage : float = 20f;
var players : ArrayList;
var lifeTime : float = 4f;

// для интерполяции
private var viewID : NetworkViewID;
private var damage : float;

function Awake() {
	players = GameObject.Find("Players").GetComponent(Players).players;
}

function Update() {
	if (lifeTime < 0) {
		Destroy(gameObject);
	}
	lifeTime -= Time.deltaTime;
	transform.position += transform.forward * Time.deltaTime * speed;
}

function OnSerializeNetworkView(stream : BitStream, info : NetworkMessageInfo) {
	var syncPosition : Vector3 = Vector3.zero;
	if (stream.isWriting) {
		stream.Serialize(damage);
		stream.Serialize(viewID);
		viewID = NetworkViewID.unassigned;
	} else {
		stream.Serialize(damage);
		stream.Serialize(viewID);
		if (viewID != NetworkViewID.unassigned) {
			for (var i : int = 0; i < players.Count; ++i) {
				if (players[i] != null) {
					if (players[i].networkView.viewID == viewID) {
						players[i].GetComponent(DogNetworkController).currentHealth -= damage;
						Destroy(gameObject);
					}
				}
			}
		}
	}
}

function OnCollisionEnter(col : Collision) {
	if (col.gameObject.name == "Dogz") {
		damage = Random.Range(minDamage, maxDamage);
		col.gameObject.GetComponent(DogNetworkController).currentHealth -= damage;
		viewID = col.gameObject.networkView.viewID;
	}
	Destroy(gameObject);
}