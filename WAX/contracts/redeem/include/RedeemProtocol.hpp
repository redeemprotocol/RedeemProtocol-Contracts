#include <eosio/eosio.hpp>
#include <eosio/singleton.hpp>
#include <eosio/asset.hpp>

using namespace eosio;
using namespace std;

CONTRACT redeemprotocol : public contract
{
public:
    using contract::contract;

    ACTION init();

    /* Redeemable NFT Standards for vIRL NFT. */

    /// @brief 
    /// @param asset_owner 
    /// @param order_id 
    /// @param asset_id 
    /// @return 
    ACTION redeem(
        name asset_owner,
        string order_id,
        uint64_t asset_id
    );

    /// @brief 
    /// @param order_id 
    /// @param asset_id 
    /// @return 
    ACTION cancel(
        string order_id,
        uint64_t asset_id
    );

    ACTION mark(
        name asset_owner,
        string order_id,
        uint64_t asset_id
    );

    ACTION transfer(
        name asset_owner,
        string order_id,
        uint64_t asset_id
    );

    ACTION burn(
        name asset_owner,
        string order_id,
        uint64_t asset_id
    );

    ACTION settr(name new_token_receiver);

    ACTION refund(uint64_t asset_id);

    TABLE redemption_s
    {
        uint64_t asset_id;
        string order_id;
        string method;
        name requester;

        uint64_t primary_key() const { return asset_id; }
    };
    typedef multi_index<"redemption"_n, redemption_s> redemption_t;

    // redemption_t redemptions;

    TABLE config_s
    {
        name token_receiver = name("waxchihkaiyu");
    };
    typedef singleton<name("config"), config_s> config_t;
    // https://github.com/EOSIO/eosio.cdt/issues/280
    typedef multi_index<name("config"), config_s> config_t_for_abi;

    config_t config = config_t(get_self(), get_self().value);
    redemption_t get_redemption();

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
    assets_t get_asset(name owner);
};