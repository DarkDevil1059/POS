import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useLogoUpload = () => {
  const { supabaseClient } = useAuth();
  const [uploading, setUploading] = useState(false);

  const uploadLogo = async (file: File): Promise<string> => {
    setUploading(true);

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const uniqueFileName = `logo_${timestamp}.${fileExt}`;
      const filePath = `logos/${user.id}/${uniqueFileName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('shop-assets')
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabaseClient.storage
        .from('shop-assets')
        .getPublicUrl(filePath);

      if (!data?.publicUrl) throw new Error('Failed to get public URL');

      return data.publicUrl;
    } finally {
      setUploading(false);
    }
  };

  return { uploadLogo, uploading };
};
