# Re-dress Rocketbox Male_Adult_21 for the first century: undyed linen tunic without buttons/pocket, leather footwear, plain wool head-cloth.
import numpy as np, sys
from PIL import Image, ImageFilter
A, O = sys.argv[1], sys.argv[2]
def load(n): return np.asarray(Image.open(f'{A}/{n}').convert('RGB')).astype(np.float32)
b = load('m251_body_color.jpg'); H, W, _ = b.shape
mx, mn = b.max(2), b.min(2); sat = mx - mn; val = mx
yy, xx = np.mgrid[0:H, 0:W]
# 1) remove buttons and chest pocket: replace the front placket area with a heavily smoothed copy
reg = (xx > 470) & (xx < 690) & (yy > 520) & (yy < 720)
sm = np.asarray(Image.fromarray(b.astype(np.uint8)).filter(ImageFilter.GaussianBlur(9))).astype(np.float32)
robe = (sat < 30) & (val > 110)
b = np.where((reg & robe)[..., None], sm, b)
# 2) undyed linen: keep the folds (luminance), change the hue
lum = b.mean(2, keepdims=True) / 232.0
linen = np.array([214, 198, 163], np.float32)
grain = (np.random.default_rng(1).normal(0, 4, (H, W, 1))).astype(np.float32)
b = np.where(robe[..., None], np.clip(linen * lum + grain, 0, 255), b)
# 3) black shoes -> worn brown leather
shoe = (yy > 690) & (sat < 45) & (val < 115)
leather = np.array([92, 62, 38], np.float32)
b = np.where(shoe[..., None], np.clip(leather * (0.55 + b.mean(2, keepdims=True) / 70.0), 0, 255), b)
Image.fromarray(b.astype(np.uint8)).save(f'{O}/paul_body_color.jpg', quality=88)
# 4) head-cloth: drop the red check pattern, keep folds, light neutral wool (tinted at runtime by the mantle colour)
k = load('m251_keffiyeh_color.jpg'); ksat = k.max(2) - k.min(2); kval = k.max(2)
cord = (kval < 70) & (ksat < 40)
kl = np.asarray(Image.fromarray(k.astype(np.uint8)).convert('L').filter(ImageFilter.GaussianBlur(2.2))).astype(np.float32)[..., None]
kl = np.clip((kl - 200) * 1.1 + 200, 0, 255) / 215.0
wool = np.array([226, 214, 188], np.float32) * kl + np.random.default_rng(2).normal(0, 5, (H, W, 1))
k = np.where(cord[..., None], np.array([58, 40, 28], np.float32) * (0.6 + k.mean(2, keepdims=True) / 90), wool)
Image.fromarray(np.clip(k, 0, 255).astype(np.uint8)).save(f'{O}/paul_cloth_color.jpg', quality=88)
for n, m in [('m251_head_color.jpg', 'paul_head_color.jpg'), ('m251_head_normal.jpg', 'paul_head_normal.jpg'), ('m251_body_normal.jpg', 'paul_body_normal.jpg'), ('m251_keffiyeh_normal.jpg', 'paul_cloth_normal.jpg')]:
    im = Image.open(f'{A}/{n}')
    if n == 'm251_body_normal.jpg':  # flatten the normal map where the buttons/pocket were
        a = np.asarray(im).astype(np.float32); s2 = np.asarray(im.filter(ImageFilter.GaussianBlur(9))).astype(np.float32)
        a = np.where(reg[..., None], s2, a); im = Image.fromarray(a.astype(np.uint8))
    if 'keffiyeh' in n: im = im.filter(ImageFilter.GaussianBlur(7))  # keep the folds, lose the woven check pattern
    im.save(f'{O}/{m}', quality=90)
print('ok')
