#pragma strict

public var player : GameObject;

// ссылка на отслеживаемый объект
public var target : Transform;

public var xSpeed : float = 12.0f;
public var ySpeed : float = 12.0f;	
public var scrollSpeed : float = 10.0f;

public var zoomMin : float = 3.0f;
public var zoomMax : float = 7.0f;

public var Ydif : float = 0.1f;

private var distance : float = 4;
private var Ypos : float; // для фиксирования Y позиции при движении персонажа
private var differenceY : float;

private var position : Vector3; // позиция камеры
private var lastTargetY : float;

private var x : float = 0.0f;
private var y : float = 0.0f;

function Awake() {
	if (!player.networkView.isMine) {
		enabled = false;
	}
}

function Start () {
	var angles : Vector3 = transform.eulerAngles;

	x = angles.y;		
	y = angles.x;

	position = -(transform.forward * distance) + target.position;
	transform.position = position;
	Ypos = transform.position.y;
	
	lastTargetY = target.position.y;
}


// выполнится после полного обновления сцены
function LateUpdate () {
	if (target) { 
		// получение значение смещения по осям
		x += Input.GetAxis("Mouse X") * xSpeed;
		y -= Input.GetAxis("Mouse Y") * ySpeed;
		
		// вращение камеры относительно поворота курсора
		transform.RotateAround(target.position,transform.up, x);
		transform.RotateAround(target.position,transform.right, y);
		
		transform.position.y = Mathf.Clamp(transform.position.y, target.position.y + Ydif, 100);
		
		// калибровка углов Эйлера
		transform.rotation = Quaternion.Euler (transform.rotation.x, transform.rotation.y, 0);
		transform.rotation = Quaternion.LookRotation(target.position - transform.position);
		Ypos = transform.position.y;

		// обнуляем значение, чтобы не продолжалось вращение
		x=0;
		y=0;
		
		if (Input.GetAxis("Mouse ScrollWheel") != 0) 
		{	
			// находим расстояние между камерой и объектом
			distance = Vector3.Distance (transform.position, target.position);	

			// проверка на выход за пределы zoom min и zoom max
			distance = ZoomLimit(distance - Input.GetAxis("Mouse ScrollWheel")*scrollSpeed, zoomMin, zoomMax);

			// вычисление нужной позиции камеры
			position = -(transform.forward*distance) + target.position;

			// перемещаем камеру
			transform.position = position;
		}
	}
}

function Update() {
	var differenceTargetY : float = 0.0f;
	if (lastTargetY != target.position.y) {
		differenceTargetY = target.position.y - lastTargetY;
		lastTargetY = target.position.y;
	}
	// проверяем вычисленное расстояние до объекта и калибруем
	var d2 : float = Vector3.Distance (transform.position, target.position);
	if (d2 != distance) {
		position = -(transform.forward * distance) + target.position;
		position.y = Ypos + differenceTargetY;
		transform.position = position;
	}
	
	// если между камерой и target есть объект
	var hit : RaycastHit;
	//var trueTargetPosition : Vector3 = target.transform.position - Vector3(0,-Ypos,0); 
	// Cast the line to check: 
	if (Physics.Linecast (target.transform.position, transform.position, hit)) { 
		distance = Vector3.Distance (transform.position, target.position);	
		// проверка на выход за пределы zoom min и zoom max
		distance = ZoomLimit(distance - 0.5f, zoomMin, zoomMax);
		// вычисление нужной позиции камеры
		position = -(transform.forward*distance) + target.position;
		// перемещаем камеру
		transform.position = position;
	}
}

function ZoomLimit(dist : float, min : float, max : float) {
	if (dist < min)
		dist = min;
	if (dist > max)
		dist = max; 
	return dist;	
}