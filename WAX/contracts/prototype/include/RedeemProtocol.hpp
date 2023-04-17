#include <eosio/eosio.hpp>
#include <eosio/singleton.hpp>
#include <eosio/asset.hpp>
#include "atomicdata.hpp"

using namespace eosio;
using namespace std;
using namespace atomicdata;

static constexpr name CORE_TOKEN_CONTRACT = name("eosio.token");
static constexpr symbol CORE_SYMBOL = symbol("WAX", 8);

struct SET_ASSET_DATA { 
    name authorized_editor;
    name asset_owner;
    uint64_t asset_id;
    ATTRIBUTE_MAP new_mutable_data;
};

struct MINTASSET_DATA {
    name authorized_minter;
    name collection_name;
    name schema_name;
    int32_t template_id;
    name new_asset_owner;
    ATTRIBUTE_MAP immutable_data;
    ATTRIBUTE_MAP mutable_data;
    vector <asset> tokens_to_back;
};

CONTRACT redeemprtcol : public contract
{
public:
    using contract::contract;

    ACTION init();

    [[eosio::on_notify("atomicassets::transfer")]] void receive_asset_transfer(
        name from,
        name to,
        vector<uint64_t> asset_ids,
        string memo
    );

    [[eosio::on_notify("*::transfer")]] void receive_token_transfer(
        name from,
        name to,
        asset amount,
        string memo
    );

    ACTION settr(name new_token_receiver);

    ACTION redeem(
        name asset_owner,
        uint64_t asset_id
    );

    ACTION accept(
        name authorized_account,
        name collection_name,
        uint64_t asset_id
    );
    
    ACTION reject(
        name authorized_account,
        name collection_name,
        uint64_t asset_id,
        string memo
    );

    ACTION release(
        name authorized_account,
        name collection_name,
        uint64_t asset_id
    );

    ACTION buyramproxy(
        name collection_to_credit,
        asset quantity
    );

    ACTION withdrawram(
        name authorized_account,
        name collection_name,
        name recipient,
        int64_t bytes
    );
private:
    TABLE redemption_s
    {
        uint64_t asset_id;
        name asset_owner;
        string status;

        uint64_t primary_key() const { return asset_id; }
    };
    typedef multi_index<name("redemption"), redemption_s> redemption_t;

    TABLE userassets_s
    {
        uint64_t asset_id;
        name asset_owner;
        uint32_t deposit_time;

        uint64_t primary_key() const { return asset_id; }
    };
    typedef multi_index<name("userassets"), userassets_s> userassets_t;

    TABLE rambalances_s {
        name    collection_name;
        int64_t byte_balance;

        uint64_t primary_key() const { return collection_name.value; }
    };

    typedef eosio::multi_index<name("rambalances"), rambalances_s> rambalances_t;
    rambalances_t rambalances = rambalances_t(get_self(), get_self().value);

    // redemption_t redemptions;
    TABLE config_s
    {
        uint64_t redemption_counter = 0;
        name token_receiver = name("waxchihkaiyu");
    };

    typedef singleton<name("config"), config_s> config_t;
    typedef multi_index<name("config"), config_s> config_t_for_abi;

    void check_collection_auth(
        name collection_name, 
        name authorized_account
    );

    void check_has_collection_auth(
        name account_to_check,
        name collection_name,
        string error_message
    );

    void increase_collection_ram_balance(
        name collection_name,
        int64_t bytes
    );

    void decrease_collection_ram_balance(
        name collection_name,
        int64_t bytes,
        string error_message
    );

    void test_collection_ram_balance(
        name collection_name,
        int64_t bytes,
        string error_message
    );

    config_t config = config_t(get_self(), get_self().value);

    redemption_t redemptions = redemption_t(get_self(), get_self().value);

    struct assets_s {
        uint64_t         asset_id;
        name             collection_name;
        name             schema_name;
        int32_t          template_id;
        name             ram_payer;
        vector <asset>   backed_tokens;
        vector <uint8_t> immutable_serialized_data;
        vector <uint8_t> mutable_serialized_data;

        uint64_t primary_key() const { return asset_id; };
    };

    typedef multi_index <name("assets"), assets_s> assets_t;

    struct schemas_s {
        name            schema_name;
        vector <FORMAT> format;

        uint64_t primary_key() const { return schema_name.value; }
    };

    typedef multi_index <name("schemas"), schemas_s> schemas_t;

    struct templates_s {
        int32_t          template_id;
        name             schema_name;
        bool             transferable;
        bool             burnable;
        uint32_t         max_supply;
        uint32_t         issued_supply;
        vector <uint8_t> immutable_serialized_data;

        uint64_t primary_key() const { return (uint64_t) template_id; }
    };

    typedef multi_index <name("templates"), templates_s> templates_t;
    
    struct collections_s {
        name             collection_name;
        name             author;
        bool             allow_notify;
        vector <name>    authorized_accounts;
        vector <name>    notify_accounts;
        double           market_fee;
        vector <uint8_t> serialized_data;

        auto primary_key() const { return collection_name.value; };
    };
    
    typedef eosio::multi_index<name("collections"), collections_s> collections_t;
    
    collections_t collections = collections_t(name("atomicassets"), name("atomicassets").value);
    
    userassets_t userassets = userassets_t(get_self(), get_self().value);

    templates_t get_templates(name collection_name) {
        return templates_t(name("atomicassets"), collection_name.value);
    }

    schemas_t get_schemas(name collection_name) {
        return schemas_t(name("atomicassets"), collection_name.value);
    }
    
    assets_t get_assets(name acc) {
        return assets_t(name("atomicassets"), acc.value);
    }
    
    redemption_t get_collection_redemptions(name collection_name) {
        return redemption_t(get_self(), collection_name.value);
    }
};