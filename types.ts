export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  hospital: string;
  content: string;
  rating: number;
}

export interface InquiryForm {
  hospitalName: string;
  contactPerson: string;
  phone: string;
  email: string;
  message: string;
}

export interface MarketAnalysisResult {
  specialty: string;
  trends: string[];
  marketingTip: string;
}
