#pragma strict
public var limbs : Rigidbody[];
public var isActive : boolean = false;


function Start () {
	for (var limb : Rigidbody in limbs) {
		limb.isKinematic = true;
	}
}

function ragdollActive() {
	var velocity : Vector3 = limbs[0].velocity;
	
	for (var limb : Rigidbody in limbs) {
		limb.isKinematic = false;
		limb.AddRelativeForce(velocity);
	}
	isActive = true;
}