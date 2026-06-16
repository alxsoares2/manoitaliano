export type CustomerDetails = {
  name: string;
  phone: string;
  address: string;
  number: string;
  neighborhood: string;
  complement: string;
  reference: string;
};

export const emptyCustomerDetails: CustomerDetails = {
  name: "",
  phone: "",
  address: "",
  number: "",
  neighborhood: "",
  complement: "",
  reference: "",
};
