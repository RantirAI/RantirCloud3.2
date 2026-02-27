-- Insert Shopify integration if it doesn't exist
INSERT INTO public.integrations (
  integration_id,
  name,
  description,
  icon,
  category,
  provider,
  version,
  node_type,
  requires_installation,
  longdescription,
  flow_builder_instructions
) VALUES (
  'shopify',
  'Shopify',
  'Integrate with Shopify Admin API for managing products, orders, customers and more',
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbDpzcGFjZT0icHJlc2VydmUiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDEwOS41IDEyNC41IiB2aWV3Qm94PSIwIDAgMTA5LjUgMTI0LjUiPjxwYXRoIGQ9Ik05NS45IDIzLjljLS4xLS42LS42LTEtMS4xLTEtLjUgMC05LjMtLjItOS4zLS4ycy03LjQtNy4yLTguMS03LjljLS43LS43LTIuMi0uNS0yLjctLjMgMCAwLTEuNC40LTMuNyAxLjEtLjQtMS4zLTEtMi44LTEuOC00LjQtMi42LTUtNi41LTcuNy0xMS4xLTcuNy0uMyAwLS42IDAtMSAuMS0uMS0uMi0uMy0uMy0uNC0uNUM1NC43LjkgNTIuMS0uMSA0OSAwYy02IC4yLTEyIDQuNS0xNi44IDEyLjItMy40IDUuNC02IDEyLjItNi44IDE3LjUtNi45IDIuMS0xMS43IDMuNi0xMS44IDMuNy0zLjUgMS4xLTMuNiAxLjItNCA0LjUtLjMgMi41LTkuNSA3My05LjUgNzNsNzYuNCAxMy4yIDMzLjEtOC4yYy0uMS0uMS0xMy42LTkxLjQtMTMuNy05MnptLTI4LjctNy4xYy0xLjguNS0zLjggMS4yLTUuOSAxLjggMC0zLS40LTcuMy0xLjgtMTAuOSA0LjUuOSA2LjcgNiA3LjcgOS4xem0tMTAgMy4xYy00IDEuMi04LjQgMi42LTEyLjggMy45IDEuMi00LjcgMy42LTkuNCA2LjQtMTIuNSAxLjEtMS4xIDIuNi0yLjQgNC4zLTMuMiAxLjggMy41IDIuMiA4LjQgMi4xIDExLjh6TTQ5LjEgNGMxLjQgMCAyLjYuMyAzLjYuOS0xLjYuOS0zLjIgMi4xLTQuNyAzLjctMy44IDQuMS02LjcgMTAuNS03LjkgMTYuNi0zLjYgMS4xLTcuMiAyLjItMTAuNSAzLjJDMzEuNyAxOC44IDM5LjggNC4zIDQ5LjEgNHoiIHN0eWxlPSJmaWxsOiM5NWJmNDciLz48cGF0aCBkPSJNOTQuOCAyMi45Yy0uNSAwLTkuMy0uMi05LjMtLjJzLTcuNC03LjItOC4xLTcuOWMtLjMtLjMtLjYtLjQtMS0uNVYxMjRsMzMuMS04LjJTOTYgMjQuNSA5NS45IDIzLjhjLS4xLS41LS42LS45LTEuMS0uOXoiIHN0eWxlPSJmaWxsOiM1ZThlM2UiLz48cGF0aCBkPSJtNTggMzkuOS0zLjggMTQuNHMtNC4zLTItOS40LTEuNmMtNy41LjUtNy41IDUuMi03LjUgNi40LjQgNi40IDE3LjMgNy44IDE4LjMgMjIuOS43IDExLjktNi4zIDIwLTE2LjQgMjAuNi0xMi4yLjgtMTguOS02LjQtMTguOS02LjRsMi42LTExczYuNyA1LjEgMTIuMSA0LjdjMy41LS4yIDQuOC0zLjEgNC43LTUuMS0uNS04LjQtMTQuMy03LjktMTUuMi0yMS43LS43LTExLjYgNi45LTIzLjQgMjMuNy0yNC40IDYuNS0uNSA5LjggMS4yIDkuOCAxLjJ6IiBzdHlsZT0iZmlsbDojZmZmIi8+PC9zdmc+',
  'Business Operations',
  'rantir',
  '1.0.0',
  'shopify',
  true,
  'Complete Shopify Admin API integration that allows you to manage your Shopify store programmatically. Perform operations on products, orders, customers, inventory, and more directly from your flows. Requires Shopify Admin API credentials to connect.',
  '{
    "setup": {
      "required_credentials": ["shop_name", "admin_api_token"],
      "instructions": "To use this integration, you need your Shopify shop name and Admin API access token. You can generate an Admin API token from your Shopify admin panel under Apps > Private apps."
    },
    "operations": {
      "products": ["create_product", "update_product", "get_product", "delete_product", "list_products"],
      "orders": ["create_order", "update_order", "get_order", "list_orders", "fulfill_order", "cancel_order"],
      "customers": ["create_customer", "update_customer", "get_customer", "list_customers"],
      "inventory": ["adjust_inventory", "get_inventory_level", "set_inventory_level"]
    }
  }'::jsonb
)
ON CONFLICT (integration_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  provider = EXCLUDED.provider,
  version = EXCLUDED.version,
  node_type = EXCLUDED.node_type,
  requires_installation = EXCLUDED.requires_installation,
  longdescription = EXCLUDED.longdescription,
  flow_builder_instructions = EXCLUDED.flow_builder_instructions,
  updated_at = now();