# 📸 FaceCameraControl (PCF)

**FaceCameraControl** es un componente de código profesional para **Microsoft Power Apps (Canvas)**. Utiliza inteligencia artificial (**MediaPipe Face Detection**) para detectar rostros en tiempo real, validar si el usuario está mirando a la cámara y capturar automáticamente una fotografía de alta calidad.

Este componente está diseñado para procesos de onboarding, fichajes biométricos o validación de identidad, eliminando la necesidad de pulsar botones manualmente.

---

## 🚀 Características Principales

*   **Detección en Tiempo Real:** Análisis a 30 FPS usando WebAssembly (MediaPipe).
*   **Feedback Visual:**
    *   🟥 **Marco Rojo:** Cara detectada pero mal posicionada (perfil) o no detectada.
    *   🟩 **Marco Verde:** Cara frontal y alineada correctamente.
*   **Auto-Captura Inteligente:** Toma la foto automáticamente solo cuando el usuario mira de frente.
*   **Salida Base64:** Devuelve la imagen lista para guardar en Dataverse, SharePoint o enviar a Azure Face API.
*   **Privacidad:** Todo el procesamiento ocurre en el navegador del cliente (Client-side), no se envían datos de vídeo a servidores externos.

---

## 🛠️ Instalación y Despliegue

### Prerrequisitos
*   Node.js (LTS)
*   Microsoft Power Platform CLI (`pac`)
*   .NET SDK

### 1. Clonar e Instalar Dependencias
Navega a la carpeta del proyecto y ejecuta:

```bash
npm install
```

### 2. Compilar el Proyecto
Para generar los archivos de distribución y comprobar errores:

```bash
npm run build
```

### 3. Desplegar a Power Apps (Entorno de Desarrollo)
Asegúrate de estar autenticado y con el entorno seleccionado:

```bash
pac auth create --url https://tu-entorno.crm.dynamics.com
pac pcf push --publisher-prefix contoso
```
---

## 📱 Configuración en Power Apps
### Paso 1: Activar Componentes de Código
1. Ve al Power Platform Admin Center.
2. Selecciona tu entorno > Configuración > Producto > Características.
3. Activa "Marco de componentes de Power Apps para aplicaciones de lienzo".

### Paso 2: Importar en la App

1. Abre tu Canvas App en modo edición.
2. Ve al panel lateral Componentes (o Insertar > Obtener más componentes).
3. Pestaña Código > Selecciona FaceCameraControl > Importar

### Paso 3: Uso en Pantalla
Arrastra el componente a tu pantalla.

#### Propiedades de Salida (Output)

|   Propiedad	 |   Tipo   |                 Descripción                         |
|--------------|----------|-----------------------------------------------------|
| ImageBase64  | Texto    | Cadena Base64 de la imagen capturada (formato JPG). |
| FaceDetected | Booleano | true si se ha realizado una captura válida.         |

#### Ejemplo de Lógica (Power Fx)
Para mostrar la foto capturada en un control de Imagen estándar:

```powerfx
// En la propiedad 'Image' de un control Image:
FaceCameraControl1.ImageBase64
```

Para guardar la foto cuando se detecte:

```powerfx
// En la propiedad 'OnChange'
If(FaceCameraControl1.FaceDetected;
    Patch(Usuarios; Defaults(Usuarios); { Foto: FaceCameraControl1.ImageBase64 })
)
```

---

## 🧠 Cómo Funciona (Lógica Interna)

1. **Inicialización:** El componente crea un elemento `<video>` oculto y un `<canvas>` visible.
2. **Bucle de Procesamiento:** Utiliza `requestAnimationFrame` para enviar frames del vídeo a la librería **MediaPipe Face Detection**.
3. **Algoritmo de Alineación:**
     * Calcula la diferencia de altura entre los ojos (inclinación).
     * Calcula la distancia de la nariz al centro de los ojos (rotación).
     * Si ambos valores están por debajo del umbral (0.05 - 0.08), se considera "Mirada Frontal".
4. **Renderizado:**
     * Dibuja el frame del vídeo en el canvas.
     * Superpone el recuadro de color (Rojo/Verde).
5. **Captura:**
     * Si es frontal, extrae el contenido del canvas a Base64 (`toDataURL`).
     * Notifica a Power Apps a través de `notifyOutputChanged()`.
  
---

## 🤝 Contribución
Si deseas mejorar el algoritmo de detección o cambiar los estilos:
 * **Lógica:** Editar `index.ts`
 * **Estilos:** Editar `css/FaceCameraControl.css`
 * **Manifiesto:** Editar `ControlManifest.Input.xml`

---

**Autor:** Oriol Farràs Sans
