export type CmsNewsRow = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  published_date: string | null;
  created_at?: string | null;
};

export type CmsServiceRow = {
  id: string;
  title: string;
  description: string;
  icon_name: string | null;
  is_active: boolean;
};

export type CmsSettingsRow = {
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  about_text: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
};
