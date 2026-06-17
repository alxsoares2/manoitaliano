export type CustomerDetails = {
  name: string;
  phone: string;
  cep: string;
  address: string;
  number: string;
  neighborhood: string;
  complement: string;
  reference: string;
  notes: string;
};

export const emptyCustomerDetails: CustomerDetails = {
  name: "",
  phone: "",
  cep: "",
  address: "",
  number: "",
  neighborhood: "",
  complement: "",
  reference: "",
  notes: "",
};
