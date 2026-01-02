"use client";

import { useState, useEffect } from "react";
import { X, Search, Building2, User, Check, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Account {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface Contact {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
}

interface LinkAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (accountId: string, contactId?: string) => void;
  customerName?: string;
  customerPhone?: string;
}

export default function LinkAccountModal({
  isOpen,
  onClose,
  onLink,
  customerName,
  customerPhone,
}: LinkAccountModalProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [step, setStep] = useState<"account" | "contact">("account");

  useEffect(() => {
    if (isOpen) {
      // Pre-fill search with customer info
      if (customerName) {
        setSearch(customerName);
      } else if (customerPhone) {
        setSearch(customerPhone);
      }
      fetchAccounts(customerName || customerPhone || "");
    }
  }, [isOpen, customerName, customerPhone]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (step === "account" && search) {
        fetchAccounts(search);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, step]);

  useEffect(() => {
    if (selectedAccount) {
      fetchContacts(selectedAccount.id);
    }
  }, [selectedAccount]);

  const fetchAccounts = async (query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      params.set("page_size", "10");

      const res = await apiFetch<{ items: Account[] }>(`/crm/accounts?${params.toString()}`);
      setAccounts(res.items);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async (accountId: string) => {
    try {
      const res = await apiFetch<{contacts: Contact[]}>(`/crm/accounts/${accountId}`);
      setContacts(res.contacts || []);
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
      setContacts([]);
    }
  };

  const handleSelectAccount = (account: Account) => {
    setSelectedAccount(account);
    setStep("contact");
  };

  const handleLink = () => {
    if (selectedAccount) {
      onLink(selectedAccount.id, selectedContact?.id);
    }
  };

  const handleClose = () => {
    setSearch("");
    setSelectedAccount(null);
    setSelectedContact(null);
    setStep("account");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {step === "account" ? "Lien ket voi khach hang" : "Chon nguoi lien he"}
          </h3>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {step === "account" ? (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tim theo ten, ma, SDT..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              {/* Account List */}
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Khong tim thay khach hang</p>
                    <button className="mt-2 text-blue-600 hover:underline flex items-center gap-1 mx-auto">
                      <Plus className="w-4 h-4" />
                      Tao khach hang moi
                    </button>
                  </div>
                ) : (
                  accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleSelectAccount(account)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-left transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {account.name}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {account.code} {account.phone && `| ${account.phone}`}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              {/* Selected Account */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
                <Building2 className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">{selectedAccount?.name}</div>
                  <div className="text-sm text-gray-500">{selectedAccount?.code}</div>
                </div>
                <button
                  onClick={() => {
                    setSelectedAccount(null);
                    setSelectedContact(null);
                    setStep("account");
                  }}
                  className="ml-auto text-sm text-blue-600 hover:underline"
                >
                  Doi
                </button>
              </div>

              {/* Contact Selection */}
              <div className="mb-2 text-sm text-gray-600">
                Chon nguoi lien he (khong bat buoc):
              </div>

              <div className="max-h-[200px] overflow-y-auto space-y-2">
                {contacts.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">Khach hang chua co nguoi lien he</p>
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedContact(
                        selectedContact?.id === contact.id ? null : contact
                      )}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                        selectedContact?.id === contact.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {contact.full_name}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {contact.phone || contact.email}
                        </div>
                      </div>
                      {selectedContact?.id === contact.id && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Huy
          </button>
          {step === "contact" && (
            <button
              onClick={handleLink}
              disabled={!selectedAccount}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Lien ket
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
