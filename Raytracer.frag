const float EPSILON = 0.00001;
const float MAX_DISTANCE = 1000000000.0;
const float GAMMA = 2.2;

// Plane is defined by a center point and a normal
// Plane texture-space is defined by two vectors v1 and v2
// that are perpendicular to each other and parallel to the
// plane
const vec3 Pp0 = vec3(0, -10, 0);
const vec3 Pn  = vec3(0, 1, 0);
const vec3 Pv1 = vec3(0.1, 0, 0);
const vec3 Pv2 = vec3(0, 0, 0.1);

// Sphere is defined by a center point and a radius
struct sphere {
    vec3 Sp0;
    float Sr;
    vec4 diffuse;
};

const sphere[] spheres = sphere[](
    sphere(vec3(0, -5, 0), 5.0, vec4(0)),
    sphere(vec3(-6, -8, -2), 2.0, vec4(0, 1, 1, 1)),
    sphere(vec3(2, -7.5, 10), 2.5, vec4(1, 0, 1, 1))
);

// Point light source
const vec3  light   = vec3(5, 10, -10);
const float ambient = 0.01;

// Sky color is blue
// Plane texture is a two-color checkerboard pattern of black and white
const vec4 skyColor    = vec4(0, 0, 1, 1);
const vec4 planeColor1 = vec4(1, 1, 1, 1);
const vec4 planeColor2 = vec4(0.5, 0.5, 0.5, 1);

bool sphereCollide(vec3 rayOrigin, vec3 rayDirection, vec3 sphereOrigin, float radius2, out float t, out vec3 normal)
{
    // Check for collision between ray and sphere
    float t1 = dot(sphereOrigin - rayOrigin, rayDirection - rayOrigin);
    // Closest point to sphere along ray lies in front of the camera if t1 > 0
    if (t1 > 0.0)
    {
        // Get distance of closest point between ray and sphere and compare it to radius
        vec3 t1Sphere = (rayOrigin + t1 * (rayDirection - rayOrigin)) - sphereOrigin;
        float d2 = dot(t1Sphere, t1Sphere);
        
        if (d2 <= radius2)
        {
            // Calculate intersection point on sphere surface
            float t0 = t1 - sqrt(radius2 - d2);
            
            if (t0 < t)
            {
                t = t0;

                // Get surface normal
                vec3 p = rayOrigin + t * (rayDirection - rayOrigin);
                normal = normalize(p - sphereOrigin);

                return true;
            }
        }
    }
    
    return false;
}

bool spheresCollide(vec3 rayOrigin, vec3 rayDirection, out float t, out vec3 normal, out vec4 diffuse)
{
    bool collision = false;

    for(int i = 0; i < spheres.length(); i++)
    {
        if (sphereCollide(rayOrigin, rayDirection, spheres[i].Sp0, spheres[i].Sr * spheres[i].Sr, t, normal))
        {
            collision = true;
            diffuse = spheres[i].diffuse;
        }
    }
    
    return collision;
}

bool planeCollide(vec3 rayOrigin, vec3 rayDirection, vec3 planeOrigin, vec3 normal, out float t)
{
    float denom = dot(normal, rayDirection - rayOrigin);
    if (denom < EPSILON)
    {
        float t0 = dot(Pp0 - rayOrigin, Pn) / denom;
        if (t0 > EPSILON && t0 < t)
        {
            t = t0;
            return true;
        }
    }
    
    return false;
}

vec4 planeTexture(vec3 planeOrigin, vec3 normal, vec3 v1, vec3 v2, vec3 p)
{
    // Determine color based on tiling checkerboard pattern texture
    vec2 uv = vec2(dot(v1, p), dot(v2, p));
    bool pattern = mod(uv.x, 1.0) > 0.5 ^^ mod(uv.y, 1.0) > 0.5;

    return pattern ? planeColor1 : planeColor2;
}

bool rayCollide(vec3 origin, vec3 direction, out float t, out vec3 normal, out vec4 diffuse)
{
    t = MAX_DISTANCE;
    bool collision = false;
    
    if (spheresCollide(origin, direction, t, normal, diffuse))
    {
        collision = true;
    }
    if (planeCollide(origin, direction, Pp0, Pn, t))
    {
        collision = true;
        normal = Pn;
        diffuse = planeTexture(Pp0, Pn, Pv1, Pv2, (direction - origin) * t + origin);
    }
    
    return collision;
}

vec3 mouseOrbitCamera()
{
    vec2 mPosition = iMouse.xy / iResolution.xy;
    vec2 drag = (mPosition - abs(iMouse.zw) / iResolution.xy);
    return vec3(drag.y * 2.0, -drag.x * 5.0, 0.0);
}

vec3 rayFromCamera(vec2 fragCoord, out vec3 camPos, vec3 camRot)
{
    // View frustum is defined as width and height of the view screen in
    // world-space units, with z representing distance from the camera position
    vec3 frustum = vec3(normalize(iResolution.xy), 1.0);
    
    // Convert screen-space pixel coordinate to view-space frustum coordinates
    vec2 ss = (fragCoord / iResolution.xy - 0.5) * frustum.xy;
    vec3 ray = normalize(vec3(ss.xy, frustum.z));
    
    mat4 transform = mat4(1.0);
    if (abs(camRot.x) > EPSILON)
    {
        float c = cos(camRot.x);
        float s = sin(camRot.x);
        mat4 rotate = mat4(
            1.0, 0.0, 0.0, 0.0,
            0.0, c,   -s,  0.0,
            0.0, s,   c,   0.0,
            0.0, 0.0, 0.0, 1.0);
        transform *= rotate;
    }
    if (abs(camRot.y) > EPSILON)
    {
        float c = cos(camRot.y);
        float s = sin(camRot.y);
        mat4 rotate = mat4(
            c,   0.0, s,   0.0,
            0.0, 1.0, 0.0, 0.0,
            -s,  0.0, c,   0.0,
            0.0, 0.0, 0.0, 1.0);
        transform *= rotate;
    }
    if (abs(camRot.z) > EPSILON)
    {
        float c = cos(camRot.z);
        float s = sin(camRot.z);
        mat4 rotate = mat4(
            c,   -s,  0.0, 0.0,
            s,   c,   0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0);
        transform *= rotate;
    }

    // Use rotation matrix to calculate the camera orbit position, then add the
    // position to the transform as a translation matrix before transforming rays
    // from view-space to world-space
    camPos = (vec4(camPos.xyz, 1.0) * transform).xyz;
    transform *= mat4(
        1.0, 0.0, 0.0, camPos.x,
        0.0, 1.0, 0.0, camPos.y,
        0.0, 0.0, 1.0, camPos.z,
        0.0, 0.0, 0.0, 1.0);
    return (vec4(ray.xyz, 1.0) * transform).xyz;
}

bool shadowed(vec3 point, vec3 normal)
{
    // Point is in shadow if the surface normal points away from the light
    if (dot(light - point, normal) < 0.0)
        return true;
    
    vec3 ray = normalize(light - point) + point;

    float t = MAX_DISTANCE;
    vec4 diffuse = vec4(1);
    return spheresCollide(point, ray, t, normal, diffuse);
}

vec4 lightPoint(vec3 point, vec3 normal, vec4 diffuse)
{
    if (!shadowed(point, normal))
    {
        float lightIncidence = 1.0 - length(cross(normalize(light - point), normal));
        return diffuse * (ambient + lightIncidence);
    }
    else
    {
        return diffuse * ambient;
    }
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec3 camPos = vec3(0, 0, -50);
    vec3 camRot = mouseOrbitCamera();
    
    vec3 ray = rayFromCamera(fragCoord, camPos, camRot);
    
    float t;
    vec3 normal;
    vec4 diffuse;
    vec4 outColor;
    
    if (rayCollide(camPos, ray, t, normal, diffuse))
    {
        vec3 p = t * (ray - camPos) + camPos;

        // Diffuse color of 0 indicates a reflective surface
        if (diffuse == vec4(0))
        {
            diffuse = skyColor;
            vec3 reflection = reflect(ray - camPos, normal);
            
            rayCollide(p, reflection + p, t, normal, diffuse);
            
            outColor = lightPoint(t * reflection + p, normal, diffuse);
        }
        else
        {
            outColor = lightPoint(p, normal, diffuse);
        }
    }
    else
    {
        outColor = skyColor;
    }
    
    // Gamma correction on the output color
    fragColor = vec4(pow(outColor.xyz, vec3(1.0/GAMMA)), 1.0);
}
