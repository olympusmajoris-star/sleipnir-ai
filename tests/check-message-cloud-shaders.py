"""Compile the real cloud shaders and verify alpha masks using Mesa EGL/GLES3.

Run: python tests/check-message-cloud-shaders.py
Requires the system EGL library; does not change browser or display settings.
"""
from pathlib import Path
import ctypes as C
import re

I, U, P, F = C.c_int, C.c_uint, C.c_void_p, C.c_float
egl_lib = C.CDLL('libEGL.so.1')
egl_lib.eglGetProcAddress.restype = P
egl_lib.eglGetProcAddress.argtypes = [C.c_char_p]


def egl(name, result, args):
    fn = getattr(egl_lib, name)
    fn.restype, fn.argtypes = result, args
    return fn


def gl(name, result, args):
    ptr = egl_lib.eglGetProcAddress(name.encode())
    if not ptr:
        raise RuntimeError(name + ' unavailable')
    return C.CFUNCTYPE(result, *args)(ptr)


get_display = C.CFUNCTYPE(P, U, P, C.POINTER(I))(
    egl_lib.eglGetProcAddress(b'eglGetPlatformDisplayEXT'))
display = get_display(0x31DD, None, None)
major, minor = I(), I()
assert egl('eglInitialize', I, [P, C.POINTER(I), C.POINTER(I)])(
    display, C.byref(major), C.byref(minor)), 'Surfaceless EGL unavailable'
egl('eglBindAPI', I, [U])(0x30A0)
attributes = (I * 13)(0x3024, 8, 0x3023, 8, 0x3022, 8, 0x3021, 8,
                      0x3033, 1, 0x3040, 0x40, 0x3038)
config, count = P(), I()
egl('eglChooseConfig', I, [P, C.POINTER(I), C.POINTER(P), I, C.POINTER(I)])(
    display, attributes, C.byref(config), 1, C.byref(count))
assert count.value, 'GLES3 config unavailable'
surface = egl('eglCreatePbufferSurface', P, [P, P, C.POINTER(I)])(
    display, config, (I * 5)(0x3057, 64, 0x3056, 64, 0x3038))
context = egl('eglCreateContext', P, [P, P, P, C.POINTER(I)])(
    display, config, None, (I * 3)(0x3098, 3, 0x3038))
assert egl('eglMakeCurrent', I, [P, P, P, P])(
    display, surface, surface, context), 'GLES3 context unavailable'
source = (Path(__file__).resolve().parents[1] / 'pages.js').read_text()
shaders = []
for name, kind in [('RVC_VS', 0x8B31), ('RVC_FS', 0x8B30)]:
    code = re.search(r'const ' + name + r' = `([\s\S]*?)`;', source).group(1).encode()
    shader = gl('glCreateShader', U, [U])(kind)
    ptr = C.c_char_p(code)
    gl('glShaderSource', None, [U, I, C.POINTER(C.c_char_p), C.POINTER(I)])(
        shader, 1, C.byref(ptr), None)
    gl('glCompileShader', None, [U])(shader)
    ok, log = I(), C.create_string_buffer(4096)
    gl('glGetShaderiv', None, [U, U, C.POINTER(I)])(shader, 0x8B81, C.byref(ok))
    gl('glGetShaderInfoLog', None, [U, I, C.POINTER(I), P])(shader, 4096, None, log)
    assert ok.value, log.value.decode()
    print(name, 'compiled')
    shaders.append(shader)
program = gl('glCreateProgram', U, [])()
for shader in shaders:
    gl('glAttachShader', None, [U, U])(program, shader)
gl('glLinkProgram', None, [U])(program)
ok = I()
gl('glGetProgramiv', None, [U, U, C.POINTER(I)])(program, 0x8B82, C.byref(ok))
assert ok.value, 'Shader program did not link'
gl('glUseProgram', None, [U])(program)


def uniform(name, *values, integer=False):
    loc = gl('glGetUniformLocation', I, [U, C.c_char_p])(program, name.encode())
    kind = I if integer else F
    gl('glUniform' + str(len(values)) + ('i' if integer else 'f'), None,
       [I] + [kind] * len(values))(loc, *values)


buffer, texture = U(), U()
gl('glGenBuffers', None, [I, C.POINTER(U)])(1, C.byref(buffer))
gl('glBindBuffer', None, [U, U])(0x8892, buffer.value)
vertices = (F * 8)(0, 0, 1, 0, 0, 1, 1, 1)
gl('glBufferData', None, [U, C.c_ssize_t, P, U])(0x8892, C.sizeof(vertices), vertices, 0x88E4)
location = gl('glGetAttribLocation', I, [U, C.c_char_p])(program, b'aP')
gl('glEnableVertexAttribArray', None, [U])(location)
gl('glVertexAttribPointer', None, [U, I, U, C.c_ubyte, I, P])(location, 2, 0x1406, 0, 0, None)
gl('glGenTextures', None, [I, C.POINTER(U)])(1, C.byref(texture))
gl('glBindTexture', None, [U, U])(0x8C1A, texture.value)
pixels = (C.c_ubyte * (32 * 32 * 2 * 4))(*([128, 128, 128, 255] * (32 * 32 * 2)))
gl('glTexImage3D', None, [U, I, I, I, I, I, I, U, U, P])(
    0x8C1A, 0, 0x8058, 32, 32, 2, 0, 0x1908, 0x1401, pixels)
for key, value in [(0x2801, 0x2601), (0x2800, 0x2601), (0x2802, 0x812F), (0x2803, 0x812F)]:
    gl('glTexParameteri', None, [U, U, I])(0x8C1A, key, value)
for name, values in {
    'uRect': (0, 0, 64, 64), 'uView': (64, 64), 'uSrcSize': (32, 32),
    'uSrcC': (16, 16), 'uC': (32, 32), 'uScale': (2,), 'uOpacity': (1,),
    'uGain': (1,), 'uContrast': (1,), 'uFill': (.95, .96, .97),
    'uLift': (.55,), 'uEven': (.25,), 'uA': (30,), 'uB': (30,), 'uN': (3.2,),
    'uFeather': (8,), 'uShape': (2, .24, 1, .25), 'uCrop': (0, 0, 32, 32),
    'uPart': (10, 1, 2, .25), 'uDir': (1, 0), 'uExt': (32,), 'uCut': (.1,),
    'uNeckWidth': (.3,), 'uErosion': (.65,), 'uDensityLoss': (.3,),
    'uLa': (0,), 'uLb': (1,), 'uMix': (.5,)
}.items():
    uniform(name, *values)
uniform('uTex', 0, integer=True)
gl('glViewport', None, [I, I, I, I])(0, 0, 64, 64)


def render(mode, cut=0, opacity=1):
    uniform('uMode', mode, integer=True)
    uniform('uCutW', cut)
    uniform('uOpacity', opacity)
    gl('glDrawArrays', None, [U, I, I])(5, 0, 4)
    image = (C.c_ubyte * (64 * 64 * 4))()
    gl('glReadPixels', None, [I, I, I, I, U, U, P])(0, 0, 64, 64, 0x1908, 0x1401, image)
    return list(image)


original = render(1)
for x, y in [(0, 0), (63, 0), (0, 63), (63, 63)]:
    assert original[(y * 64 + x) * 4 + 3] == 0, 'Rectangular source corner leaked'
center = (32 * 64 + 32) * 4
assert original[center + 3] == 255, 'Dense center unexpectedly transparent'
body = render(0)
assert max(abs(body[center + k] - original[center + k]) for k in range(3)) <= 1, 'Base and edge lighting differ'
for weight in [0, .25, .5, 1]:
    parent = render(1, weight)
    fragment = render(2, opacity=weight)
    error = max(abs(parent[i] + fragment[i] - original[i]) for i in range(3, len(original), 4))
    assert error <= 1, 'Fragment does not originate from matching parent pixels'
print('PASS: transparent corners, dense core, matched lighting, continuous parent/fragment masks')
egl('eglMakeCurrent', I, [P, P, P, P])(display, None, None, None)
egl('eglDestroyContext', I, [P, P])(display, context)
egl('eglDestroySurface', I, [P, P])(display, surface)
egl('eglTerminate', I, [P])(display)
