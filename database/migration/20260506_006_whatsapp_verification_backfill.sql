UPDATE public.user_whatsapp_contacts AS contact
SET
  verification_status = 'verified',
  updated_at = NOW()
WHERE verification_status <> 'verified'
  AND EXISTS (
    SELECT 1
    FROM public.whatsapp_messages AS message
    WHERE message.contact_id = contact.id
      AND message.direction = 'incoming'
  );

UPDATE public.user_whatsapp_contacts
SET
  verification_status = 'pending',
  updated_at = NOW()
WHERE verification_status = 'registered';
