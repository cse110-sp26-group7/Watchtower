-- Fix demo user hash to match Web Crypto PBKDF2 byte-encoding (salt as bytes not hex string)
UPDATE users
SET password_hash = '876768b5fb082cc511a66826e0f707b3f7f71bf89c0ad84cbf59a2f7d94048b0',
    salt = 'e7969f05280546e27cbbd01cdf459031'
WHERE id = 'usr_demo';
